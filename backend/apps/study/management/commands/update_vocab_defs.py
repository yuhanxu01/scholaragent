from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.study.models import Vocabulary
from apps.study.vocabulary_views import get_dictionary_instance


class Command(BaseCommand):
    help = 'Update vocabulary definitions from dictionary'

    def handle(self, *args, **options):
        dictionary = get_dictionary_instance()

        if not dictionary:
            self.stdout.write(self.style.ERROR('无法加载词典'))
            return

        # 查找所有没有释义或释义为空的单词
        vocabularies = Vocabulary.objects.filter(
            Q(definition='') | Q(definition__isnull=True)
        )

        self.stdout.write(f'找到 {vocabularies.count()} 个需要更新的单词')

        for vocab in vocabularies:
            self.stdout.write(f'\n正在处理单词: {vocab.word}')

            # 从词典查找
            result = dictionary.lookup_word(vocab.word)

            if result:
                # 更新单词信息
                vocab.pronunciation = result.get('pronunciation', '')
                vocab.definition = result.get('definition', '')
                vocab.translation = result.get('translation', '')

                # 如果有例句，使用第一个
                examples = result.get('examples', [])
                if examples:
                    vocab.example_sentence = examples[0]

                vocab.save()

                self.stdout.write(self.style.SUCCESS(f'  ✓ 已更新'))
                self.stdout.write(f'    - 音标: {vocab.pronunciation}')
                self.stdout.write(f'    - 释义: {vocab.definition[:50]}...')
                self.stdout.write(f'    - 翻译: {vocab.translation}')
            else:
                self.stdout.write(self.style.ERROR(f'  ✗ 词典中未找到该单词'))