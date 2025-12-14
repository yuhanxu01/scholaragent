import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Vocabulary
from .vocabulary_views import get_dictionary_instance

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(bind=True, max_retries=3)
def update_word_definition(self, vocabulary_id):
    """更新单个生词的释义"""
    try:
        vocabulary = Vocabulary.objects.get(id=vocabulary_id)

        # 如果已经有释义，跳过
        if vocabulary.definition and vocabulary.definition.strip():
            return f"Word '{vocabulary.word}' already has definition"

        # 获取词典实例并查询
        dictionary = get_dictionary_instance()
        if not dictionary:
            return f"Dictionary service not available for word '{vocabulary.word}'"

        result = dictionary.lookup_word(vocabulary.word)
        if result:
            # 更新生词信息
            updated = False
            if result.get('pronunciation') and not vocabulary.pronunciation:
                vocabulary.pronunciation = result['pronunciation']
                updated = True

            if result.get('definition') and result['definition'].strip():
                vocabulary.definition = result['definition']
                updated = True

            if result.get('translation') and result['translation'].strip():
                vocabulary.translation = result['translation']
                updated = True

            if not vocabulary.example_sentence and result.get('examples'):
                vocabulary.example_sentence = result['examples'][0]
                updated = True

            if updated:
                vocabulary.save()
                return f"Updated definition for '{vocabulary.word}'"
            else:
                return f"No new information found for '{vocabulary.word}'"
        else:
            logger.warning(f"No definition found for word '{vocabulary.word}'")
            return f"No definition found for word '{vocabulary.word}'"

    except Vocabulary.DoesNotExist:
        logger.error(f"Vocabulary with id {vocabulary_id} not found")
        return f"Vocabulary with id {vocabulary_id} not found"
    except Exception as e:
        logger.error(f"Error updating definition for vocabulary {vocabulary_id}: {str(e)}")
        # 重试机制
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        return f"Failed to update definition for vocabulary {vocabulary_id}: {str(e)}"


@shared_task(bind=True)
def update_missing_definitions(user_id):
    """批量更新用户所有没有释义的生词"""
    try:
        user = User.objects.get(id=user_id)

        # 获取所有没有释义的生词
        vocabularies = Vocabulary.objects.filter(
            user=user
        ).filter(
            Q(definition__isnull=True) | Q(definition__exact='')
        )

        count = 0
        updated_count = 0

        for vocabulary in vocabularies:
            count += 1
            dictionary = get_dictionary_instance()

            if not dictionary:
                logger.warning(f"Dictionary service not available")
                continue

            result = dictionary.lookup_word(vocabulary.word)
            if result and result.get('definition') and result['definition'].strip():
                # 更新生词信息
                vocabulary.pronunciation = result.get('pronunciation', vocabulary.pronunciation)
                vocabulary.definition = result['definition']
                vocabulary.translation = result.get('translation', vocabulary.translation)
                if not vocabulary.example_sentence and result.get('examples'):
                    vocabulary.example_sentence = result['examples'][0]
                vocabulary.save()
                updated_count += 1
                logger.info(f"Updated definition for '{vocabulary.word}'")

        return f"Processed {count} words, updated {updated_count} definitions for user {user.username}"

    except User.DoesNotExist:
        logger.error(f"User with id {user_id} not found")
        return f"User with id {user_id} not found"
    except Exception as e:
        logger.error(f"Error updating missing definitions for user {user_id}: {str(e)}")
        return f"Error updating missing definitions for user {user_id}: {str(e)}"


@shared_task
def cleanup_empty_definitions():
    """清理所有用户的空释义生词（定期任务）"""
    try:
        vocabularies = Vocabulary.objects.filter(
            Q(definition__isnull=True) | Q(definition__exact='')
        )

        total_count = vocabularies.count()
        processed_count = 0
        updated_count = 0

        dictionary = get_dictionary_instance()
        if not dictionary:
            return f"Dictionary service not available"

        for vocabulary in vocabularies:
            processed_count += 1
            result = dictionary.lookup_word(vocabulary.word)

            if result and result.get('definition') and result['definition'].strip():
                vocabulary.pronunciation = result.get('pronunciation', vocabulary.pronunciation)
                vocabulary.definition = result['definition']
                vocabulary.translation = result.get('translation', vocabulary.translation)
                if not vocabulary.example_sentence and result.get('examples'):
                    vocabulary.example_sentence = result['examples'][0]
                vocabulary.save()
                updated_count += 1

                # 每100个单词记录一次进度
                if processed_count % 100 == 0:
                    logger.info(f"Processed {processed_count}/{total_count} words, updated {updated_count}")

        return f"Cleanup completed: processed {processed_count} words, updated {updated_count} definitions"

    except Exception as e:
        logger.error(f"Error in cleanup task: {str(e)}")
        return f"Error in cleanup task: {str(e)}"