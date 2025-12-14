import os
import threading
import json
import csv
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Avg
import logging

logger = logging.getLogger(__name__)

from .models import Vocabulary, VocabularyReview, VocabularyList, VocabularyListMembership
from .vocabulary_serializers import (
    VocabularySerializer, VocabularyCreateSerializer,
    VocabularyReviewSerializer, VocabularyListSerializer,
    VocabularyListCreateSerializer, DictionaryLookupSerializer,
    VocabularySearchSerializer
)
from .trie_dictionary import TrieDictionary
from .stardict_sqlite import StarDictSQLite


# 全局词典实例缓存
_dictionary_cache = {}
_trie_loading = False
_trie_loaded = False

class HybridDictionary:
    """混合词典，优先使用Trie，然后是StarDict SQLite"""

    def __init__(self, trie_dict=None, stardict_dict=None):
        self.trie_dict = trie_dict
        self.stardict_dict = stardict_dict

    def lookup_word(self, word):
        # 优先尝试Trie词典
        if self.trie_dict:
            result = self.trie_dict.lookup_word(word)
            if result:
                return result

        # 回退到StarDict SQLite词典
        if self.stardict_dict:
            result = self.stardict_dict.lookup_word(word)
            if result:
                return result

        return None

    def search_words(self, pattern, limit=20):
        # 优先从Trie搜索
        if self.trie_dict:
            trie_results = self.trie_dict.search_words(pattern, limit)
            if trie_results:
                return trie_results

        # 如果Trie没有结果，尝试StarDict SQLite
        if self.stardict_dict:
            stardict_results = self.stardict_dict.search_words(pattern, limit)
            if stardict_results:
                return stardict_results

        return []

    def get_info(self):
        info = {'BookTitle': 'Hybrid Dictionary (Trie + StarDict)'}
        if self.trie_dict:
            trie_info = self.trie_dict.get_info()
            info['trie_word_count'] = trie_info.get('WordCount', 0)
        if self.stardict_dict:
            stardict_info = self.stardict_dict.get_info()
            info['stardict_word_count'] = stardict_info.get('WordCount', 0)
        return info

    def set_trie_dict(self, trie_dict):
        """设置Trie词典（用于后台加载）"""
        self.trie_dict = trie_dict


def _load_stardict_sync(stardict_path):
    """同步加载StarDict SQLite词典"""
    try:
        stardict_dict = StarDictSQLite(stardict_path)
        if stardict_dict.load_dictionary():
            logger.info("StarDict SQLite词典加载成功")
            return stardict_dict
        else:
            logger.warning("StarDict SQLite词典加载失败")
            return None
    except Exception as e:
        logger.warning(f"StarDict SQLite词典加载异常: {e}")
        return None


def _load_trie_background(stardict_path, hybrid_dict):
    """后台加载Trie词典并更新混合词典"""
    global _trie_loading, _trie_loaded
    try:
        logger.info("后台开始加载Trie词典...")
        trie_dict = TrieDictionary()
        if trie_dict.load_dictionary(stardict_path):
            logger.info("Trie词典后台加载成功")
            hybrid_dict.set_trie_dict(trie_dict)
            _trie_loaded = True
        else:
            logger.warning("Trie词典后台加载失败")
    except Exception as e:
        logger.warning(f"Trie词典后台加载异常: {e}")
    finally:
        _trie_loading = False


def get_dictionary_instance():
    """获取词典实例"""
    global _dictionary_cache, _trie_loading, _trie_loaded

    # 检查缓存是否有效
    if 'hybrid_dict' in _dictionary_cache and _dictionary_cache['hybrid_dict'] is not None:
        return _dictionary_cache['hybrid_dict']

    # 获取StarDict数据库路径
    stardict_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', '..', 'stardict.db')

    # 同步加载StarDict SQLite（快速）
    stardict_dict = None
    if os.path.exists(stardict_path):
        stardict_dict = _load_stardict_sync(stardict_path)

    # 创建混合词典（初始时Trie为空）
    hybrid_dict = HybridDictionary(trie_dict=None, stardict_dict=stardict_dict)
    _dictionary_cache['hybrid_dict'] = hybrid_dict

    # 如果Trie尚未加载且未在加载中，启动后台线程加载Trie
    if not _trie_loaded and not _trie_loading and os.path.exists(stardict_path):
        _trie_loading = True
        import threading
        thread = threading.Thread(
            target=_load_trie_background,
            args=(stardict_path, hybrid_dict),
            daemon=True
        )
        thread.start()
        logger.info("已启动后台线程加载Trie词典")

    if stardict_dict:
        logger.info("使用StarDict SQLite词典（Trie加载中）")
    else:
        logger.error("所有词典加载失败")

    return hybrid_dict


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dictionary_lookup(request):
    """词典查词接口"""
    word = request.GET.get('word', '').strip()

    if not word:
        return Response(
            {'error': '单词不能为空'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 首先尝试从数据库查找用户已保存的单词
    try:
        vocabulary = Vocabulary.objects.filter(
            user=request.user,
            word__iexact=word
        ).first()

        if vocabulary:
            serializer = VocabularySerializer(vocabulary)
            return Response({
                'from_database': True,
                'word': serializer.data
            })
    except Exception as e:
        print(f"Error querying vocabulary: {e}")

    # 从MDX词典查询
    dictionary = get_dictionary_instance()
    if not dictionary:
        return Response(
            {'error': '词典服务不可用'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    try:
        result = dictionary.lookup_word(word)

        if result:
            result['word'] = word
            result['from_database'] = False
            result['source'] = dictionary.get_info().get('BookTitle', 'MDX Dictionary')

            return Response(result)
        else:
            return Response(
                {'error': '未找到该单词', 'suggestions': []},
                status=status.HTTP_404_NOT_FOUND
            )

    except Exception as e:
        return Response(
            {'error': f'词典查询失败: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dictionary_search(request):
    """词典搜索单词接口"""
    pattern = request.GET.get('pattern', '').strip()
    limit = min(int(request.GET.get('limit', 20)), 100)  # 限制最大返回数量

    if not pattern:
        return Response(
            {'error': '搜索内容不能为空'},
            status=status.HTTP_400_BAD_REQUEST
        )

    dictionary = get_dictionary_instance()
    if not dictionary:
        return Response(
            {'error': '词典服务不可用'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    try:
        words = dictionary.search_words(pattern, limit)
        return Response({
            'pattern': pattern,
            'words': words,
            'count': len(words)
        })

    except Exception as e:
        return Response(
            {'error': f'搜索失败: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dictionary_autocomplete(request):
    """词典自动补全接口"""
    pattern = request.GET.get('q', '').strip().lower()
    limit = min(int(request.GET.get('limit', 5)), 10)  # 默认返回5个候选

    if not pattern or len(pattern) < 2:
        return Response({
            'suggestions': [],
            'pattern': pattern
        })

    dictionary = get_dictionary_instance()
    if not dictionary:
        return Response(
            {'error': '词典服务不可用'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    try:
        # 搜索单词
        suggestions = dictionary.search_words(pattern, limit)

        # 为每个建议添加详细信息
        enriched_suggestions = []
        for word in suggestions:
            # 获取单词的详细信息
            word_info = dictionary.lookup_word(word)
            if word_info:
                enriched_suggestions.append({
                    'word': word,
                    'pronunciation': word_info.get('pronunciation', ''),
                    'definition': word_info.get('definition', ''),
                    'translation': word_info.get('translation', ''),
                    'examples': word_info.get('examples', [])[:1] if word_info.get('examples') else []  # 只返回第一个例句
                })
            else:
                enriched_suggestions.append({
                    'word': word,
                    'pronunciation': '',
                    'definition': '',
                    'translation': '',
                    'examples': []
                })

        return Response({
            'suggestions': enriched_suggestions,
            'pattern': pattern,
            'count': len(enriched_suggestions)
        })

    except Exception as e:
        return Response(
            {'error': f'自动补全失败: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class VocabularyPagination(PageNumberPagination):
    """生词分页"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def vocabulary_list(request):
    """生词列表接口"""
    if request.method == 'GET':
        # 构建查询
        queryset = Vocabulary.objects.filter(user=request.user)

        # 应用筛选
        search_serializer = VocabularySearchSerializer(data=request.GET)
        if search_serializer.is_valid():
            data = search_serializer.validated_data

            if data.get('query'):
                queryset = queryset.filter(
                    Q(word__icontains=data['query']) |
                    Q(definition__icontains=data['query']) |
                    Q(translation__icontains=data['query'])
                )

            if data.get('category') != 'all':
                queryset = queryset.filter(category=data['category'])

            if data.get('mastery_level'):
                queryset = queryset.filter(mastery_level=data['mastery_level'])

            if data.get('is_favorite') is not None:
                queryset = queryset.filter(is_favorite=data['is_favorite'])

            if data.get('date_from'):
                queryset = queryset.filter(created_at__date__gte=data['date_from'])

            if data.get('date_to'):
                queryset = queryset.filter(created_at__date__lte=data['date_to'])

            # 排序
            sort_by = data['sort_by']
            sort_order = '-' if data['sort_order'] == 'desc' else ''
            queryset = queryset.order_by(f"{sort_order}{sort_by}")

        # 分页
        paginator = VocabularyPagination()
        page = paginator.paginate_queryset(queryset, request)

        if page is not None:
            serializer = VocabularySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = VocabularySerializer(queryset, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # 创建新生词
        serializer = VocabularyCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            vocabulary = serializer.save()
            response_serializer = VocabularySerializer(vocabulary)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def vocabulary_detail(request, pk):
    """生词详情接口"""
    vocabulary = get_object_or_404(Vocabulary, pk=pk, user=request.user)

    if request.method == 'GET':
        serializer = VocabularySerializer(vocabulary)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = VocabularyCreateSerializer(
            vocabulary,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            vocabulary = serializer.save()
            response_serializer = VocabularySerializer(vocabulary)
            return Response(response_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        vocabulary.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def batch_create_vocabulary(request):
    """批量创建生词接口"""
    words = request.data.get('words', [])
    if not words:
        return Response(
            {'error': '请提供要添加的单词列表'},
            status=status.HTTP_400_BAD_REQUEST
        )

    results = []
    for word_data in words:
        word = word_data.get('word', '').strip() if isinstance(word_data, dict) else word_data.strip()
        context = word_data.get('context', '') if isinstance(word_data, dict) else ''

        if not word:
            continue

        data = {'word': word}
        if context:
            data['context'] = context

        # 从词典自动填充信息
        dictionary = get_dictionary_instance()
        if dictionary:
            dict_result = dictionary.lookup_word(word)
            if dict_result:
                data.setdefault('pronunciation', dict_result.get('pronunciation', ''))
                data.setdefault('definition', dict_result.get('definition', ''))
                data.setdefault('translation', dict_result.get('translation', ''))
                if dict_result.get('examples'):
                    data.setdefault('example_sentence', dict_result['examples'][0])

        serializer = VocabularyCreateSerializer(
            data=data,
            context={'request': request}
        )

        if serializer.is_valid():
            vocabulary = serializer.save()
            response_serializer = VocabularySerializer(vocabulary)
            results.append(response_serializer.data)
        else:
            results.append({
                'word': word,
                'error': serializer.errors,
                'status': 'failed'
            })

    # 同步检查并更新没有释义的单词
    try:
        dictionary = get_dictionary_instance()
        if dictionary:
            for result in results:
                if isinstance(result, dict) and result.get('id'):
                    # 获取刚创建的生词
                    vocabulary = Vocabulary.objects.get(id=result['id'], user=request.user)
                    if not vocabulary.definition:
                        dict_result = dictionary.lookup_word(vocabulary.word)
                        if dict_result and dict_result.get('definition') and dict_result['definition'].strip():
                            vocabulary.definition = dict_result['definition']
                            vocabulary.pronunciation = dict_result.get('pronunciation', vocabulary.pronunciation)
                            vocabulary.translation = dict_result.get('translation', vocabulary.translation)
                            if not vocabulary.example_sentence and dict_result.get('examples'):
                                vocabulary.example_sentence = dict_result['examples'][0]
                            vocabulary.save()
                            # 更新结果
                            result['definition'] = vocabulary.definition
                            result['pronunciation'] = vocabulary.pronunciation
                            result['translation'] = vocabulary.translation
                            result['example_sentence'] = vocabulary.example_sentence
    except Exception as e:
        logger.error(f"Error batch updating definitions: {str(e)}")

    return Response({
        'results': results,
        'total': len(results),
        'message': f'已处理 {len(results)} 个单词'
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_vocabulary(request):
    """快速创建生词接口"""
    data = request.data.copy()

    # 如果提供了源文档ID，验证文档存在且用户有权限
    if 'source_document_id' in data:
        from apps.documents.models import Document
        try:
            document = Document.objects.get(
                id=data['source_document_id'],
                user=request.user
            )
            data['source_document'] = document.id
        except Document.DoesNotExist:
            return Response(
                {'error': '源文档不存在或无权限'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # 从词典自动填充信息
    word = data.get('word', '').strip()
    if word:
        dictionary = get_dictionary_instance()
        if dictionary:
            dict_result = dictionary.lookup_word(word)
            if dict_result:
                data.setdefault('pronunciation', dict_result.get('pronunciation', ''))
                data.setdefault('definition', dict_result.get('definition', ''))
                data.setdefault('translation', dict_result.get('translation', ''))
                if dict_result.get('examples'):
                    data.setdefault('example_sentence', dict_result['examples'][0])

    serializer = VocabularyCreateSerializer(
        data=data,
        context={'request': request}
    )

    if serializer.is_valid():
        vocabulary = serializer.save()
        response_serializer = VocabularySerializer(vocabulary)

        # 如果没有释义，同步尝试获取释义
        if not vocabulary.definition:
            try:
                dictionary = get_dictionary_instance()
                if dictionary:
                    result = dictionary.lookup_word(vocabulary.word)
                    if result and result.get('definition') and result['definition'].strip():
                        vocabulary.definition = result['definition']
                        vocabulary.pronunciation = result.get('pronunciation', vocabulary.pronunciation)
                        vocabulary.translation = result.get('translation', vocabulary.translation)
                        if not vocabulary.example_sentence and result.get('examples'):
                            vocabulary.example_sentence = result['examples'][0]
                        vocabulary.save()
                        # 更新响应序列化器
                        response_serializer = VocabularySerializer(vocabulary)
            except Exception as e:
                logger.error(f"Error updating definition for {vocabulary.word}: {str(e)}")
                # 不抛出异常，让请求继续成功

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_vocabulary(request, pk):
    """更新生词掌握程度"""
    vocabulary = get_object_or_404(Vocabulary, pk=pk, user=request.user)

    mastery_level = request.data.get('mastery_level')
    if mastery_level is not None:
        try:
            mastery_level = int(mastery_level)
            if 1 <= mastery_level <= 5:
                vocabulary.mastery_level = mastery_level
                vocabulary.review_count += 1
                vocabulary.last_reviewed_at = timezone.now()
                vocabulary.save()

                serializer = VocabularySerializer(vocabulary)
                return Response(serializer.data)
        except (ValueError, TypeError):
            pass

    return Response(
        {'error': '无效的掌握程度值'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_vocabulary(request, pk):
    """删除生词"""
    vocabulary = get_object_or_404(Vocabulary, pk=pk, user=request.user)
    vocabulary.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_favorite(request, pk):
    """切换生词收藏状态"""
    vocabulary = get_object_or_404(Vocabulary, pk=pk, user=request.user)
    vocabulary.is_favorite = not vocabulary.is_favorite
    vocabulary.save()

    return Response({
        'is_favorite': vocabulary.is_favorite
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def review_vocabulary(request, pk):
    """复习生词接口"""
    vocabulary = get_object_or_404(Vocabulary, pk=pk, user=request.user)

    # 创建复习记录
    review_data = {
        'vocabulary': vocabulary.id,
        'user': request.user.id,
        'is_correct': request.data.get('is_correct', False),
        'response_time': request.data.get('response_time'),
        'difficulty_rating': request.data.get('difficulty_rating'),
        'review_type': request.data.get('review_type', 'flashcard')
    }

    serializer = VocabularyReviewSerializer(data=review_data)
    if serializer.is_valid():
        review = serializer.save()

        # 更新生词信息
        vocabulary.review_count += 1
        vocabulary.last_reviewed_at = timezone.now()

        # 根据答题结果调整掌握程度
        if review.is_correct:
            vocabulary.mastery_level = min(5, vocabulary.mastery_level + 1)
        else:
            vocabulary.mastery_level = max(1, vocabulary.mastery_level - 1)

        vocabulary.save()

        response_serializer = VocabularySerializer(vocabulary)
        return Response(response_serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def next_review_word(request):
    """获取下一个需要复习的单词"""
    # 优先选择复习次数少、掌握程度低的单词
    vocabulary = Vocabulary.objects.filter(
        user=request.user
    ).order_by(
        'review_count',
        'mastery_level',
        'last_reviewed_at'
    ).first()

    if vocabulary:
        serializer = VocabularySerializer(vocabulary)
        return Response(serializer.data)
    else:
        return Response({'message': '暂无需要复习的单词'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def review_history(request):
    """复习历史记录"""
    reviews = VocabularyReview.objects.filter(
        user=request.user
    ).select_related('vocabulary').order_by('-created_at')[:50]

    serializer = VocabularyReviewSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_missing_definitions(request):
    """手动触发批量更新缺失的释义"""
    from django.db.models import Q

    # 获取所有没有释义的生词
    vocabularies = Vocabulary.objects.filter(
        user=request.user
    ).filter(
        Q(definition__isnull=True) | Q(definition__exact='')
    )

    count = 0
    updated_count = 0

    dictionary = get_dictionary_instance()
    if not dictionary:
        return Response(
            {'error': '词典服务不可用'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    for vocabulary in vocabularies:
        count += 1
        result = dictionary.lookup_word(vocabulary.word)
        if result and result.get('definition') and result['definition'].strip():
            vocabulary.pronunciation = result.get('pronunciation', vocabulary.pronunciation)
            vocabulary.definition = result['definition']
            vocabulary.translation = result.get('translation', vocabulary.translation)
            if not vocabulary.example_sentence and result.get('examples'):
                vocabulary.example_sentence = result['examples'][0]
            vocabulary.save()
            updated_count += 1

    return Response({
        'message': f'批量更新完成',
        'total': count,
        'updated': updated_count
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_word_definition(request, pk):
    """手动更新单个单词的释义"""
    try:
        vocabulary = get_object_or_404(Vocabulary, pk=pk, user=request.user)

        dictionary = get_dictionary_instance()
        if not dictionary:
            return Response(
                {'error': '词典服务不可用'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        result = dictionary.lookup_word(vocabulary.word)
        if result and result.get('definition') and result['definition'].strip():
            vocabulary.pronunciation = result.get('pronunciation', vocabulary.pronunciation)
            vocabulary.definition = result['definition']
            vocabulary.translation = result.get('translation', vocabulary.translation)
            if not vocabulary.example_sentence and result.get('examples'):
                vocabulary.example_sentence = result['examples'][0]
            vocabulary.save()

            serializer = VocabularySerializer(vocabulary)
            return Response({
                'message': f'已更新释义：{vocabulary.word}',
                'vocabulary': serializer.data
            })
        else:
            return Response(
                {'error': f'未找到单词 {vocabulary.word} 的释义'},
                status=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        return Response(
            {'error': f'更新释义失败: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def vocabulary_list_collections(request):
    """生词列表管理接口"""
    lists = VocabularyList.objects.filter(user=request.user).annotate(
        word_count=Count('word_memberships')
    ).order_by('-created_at')

    serializer = VocabularyListSerializer(lists, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_vocabulary_list(request):
    """创建生词列表接口"""
    serializer = VocabularyListCreateSerializer(
        data=request.data,
        context={'request': request}
    )

    if serializer.is_valid():
        vocab_list = serializer.save()
        response_serializer = VocabularyListSerializer(vocab_list)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def vocabulary_list_detail(request, pk):
    """生词列表详情接口"""
    vocab_list = get_object_or_404(VocabularyList, pk=pk, user=request.user)

    if request.method == 'GET':
        # 获取列表中的单词
        memberships = VocabularyListMembership.objects.filter(
            vocabulary_list=vocab_list
        ).select_related('vocabulary')

        words = [membership.vocabulary for membership in memberships]
        serializer = VocabularySerializer(words, many=True)

        list_serializer = VocabularyListSerializer(vocab_list)
        return Response({
            'list': list_serializer.data,
            'words': serializer.data
        })

    elif request.method == 'PUT':
        serializer = VocabularyListCreateSerializer(
            vocab_list,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            vocab_list = serializer.save()
            response_serializer = VocabularyListSerializer(vocab_list)
            return Response(response_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        vocab_list.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_word_to_list(request, pk):
    """添加单词到生词列表"""
    vocab_list = get_object_or_404(VocabularyList, pk=pk, user=request.user)
    word_id = request.data.get('word_id')

    if not word_id:
        return Response(
            {'error': '缺少单词ID'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        vocabulary = Vocabulary.objects.get(id=word_id, user=request.user)
    except Vocabulary.DoesNotExist:
        return Response(
            {'error': '单词不存在'},
            status=status.HTTP_404_NOT_FOUND
        )

    # 检查是否已存在
    if VocabularyListMembership.objects.filter(
        vocabulary=vocabulary,
        vocabulary_list=vocab_list
    ).exists():
        return Response(
            {'error': '单词已在该列表中'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 添加到列表
    VocabularyListMembership.objects.create(
        vocabulary=vocabulary,
        vocabulary_list=vocab_list
    )

    return Response({'message': '单词已添加到列表'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def remove_word_from_list(request, pk):
    """从生词列表移除单词"""
    vocab_list = get_object_or_404(VocabularyList, pk=pk, user=request.user)
    word_id = request.data.get('word_id')

    if not word_id:
        return Response(
            {'error': '缺少单词ID'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        membership = VocabularyListMembership.objects.get(
            vocabulary_id=word_id,
            vocabulary_list=vocab_list
        )
        membership.delete()
        return Response({'message': '单词已从列表移除'})
    except VocabularyListMembership.DoesNotExist:
        return Response(
            {'error': '单词不在此列表中'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def vocabulary_stats(request):
    """获取生词统计数据"""
    from datetime import datetime, timedelta
    from django.utils import timezone

    # 获取当前用户的生词统计
    vocabularies = Vocabulary.objects.filter(user=request.user)

    # 基础统计
    total_words = vocabularies.count()

    # 按类别分组统计
    words_by_category = {}
    for vocab in vocabularies:
        category = vocab.category or '未分类'
        words_by_category[category] = words_by_category.get(category, 0) + 1

    # 按掌握程度分组统计
    words_by_mastery_level = {}
    for level in range(1, 6):
        words_by_mastery_level[str(level)] = vocabularies.filter(mastery_level=level).count()

    # 今日复习统计
    today = timezone.now().date()
    today_reviews = VocabularyReview.objects.filter(
        vocabulary__user=request.user,
        created_at__date=today
    ).count()

    # 待复习单词数（简化逻辑：掌握程度低于3的单词）
    words_due_for_review = vocabularies.filter(mastery_level__lt=3).count()

    # 本周新增单词数
    week_ago = timezone.now() - timedelta(days=7)
    new_words_this_week = vocabularies.filter(created_at__gte=week_ago).count()

    # 学习连续天数（简化计算）
    # 这里可以根据实际需要实现更复杂的连续学习天数计算
    learning_streak = 0

    # 尝试计算连续学习天数
    try:
        # 获取用户最近的复习记录日期
        recent_review_dates = VocabularyReview.objects.filter(
            vocabulary__user=request.user
        ).values_list('created_at__date', flat=True).distinct().order_by('-created_at__date')[:30]

        if recent_review_dates:
            current_streak = 0
            check_date = timezone.now().date()

            for review_date in recent_review_dates:
                if review_date == check_date:
                    current_streak += 1
                    check_date -= timedelta(days=1)
                elif review_date < check_date:
                    break

            learning_streak = current_streak
    except Exception as e:
        logger.warning(f"计算学习连续天数失败: {e}")
        learning_streak = 0

    stats = {
        'total_words': total_words,
        'words_by_category': words_by_category,
        'words_by_mastery_level': words_by_mastery_level,
        'reviews_today': today_reviews,
        'words_due_for_review': words_due_for_review,
        'new_words_this_week': new_words_this_week,
        'learning_streak': learning_streak,
    }

    return Response(stats)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_vocabulary(request):
    """导出生词本"""
    format_type = request.GET.get('format', 'json').lower()

    if format_type not in ['json', 'csv']:
        return Response(
            {'error': '不支持的导出格式，支持 JSON 和 CSV'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 获取用户的生词列表（包含关联文档）
    vocabularies = Vocabulary.objects.filter(user=request.user).select_related('source_document').order_by('created_at')

    if format_type == 'json':
        # JSON 格式导出
        export_data = []
        for vocab in vocabularies:
            export_data.append({
                'word': vocab.word,
                'pronunciation': vocab.pronunciation or '',
                'definition': vocab.definition or '',
                'translation': vocab.translation or '',
                'example_sentence': vocab.example_sentence or '',
                'example_translation': vocab.example_translation or '',
                'context': vocab.context or '',
                'source_document': vocab.source_document.title if vocab.source_document else '',
                'mastery_level': vocab.mastery_level,
                'category': vocab.category,
                'tags': vocab.tags,
                'review_count': vocab.review_count,
                'is_favorite': vocab.is_favorite,
                'created_at': vocab.created_at.isoformat(),
                'updated_at': vocab.updated_at.isoformat(),
            })

        response = HttpResponse(
            json.dumps(export_data, ensure_ascii=False, indent=2),
            content_type='application/json; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="vocabulary_{timezone.now().date()}.json"'

    elif format_type == 'csv':
        # CSV 格式导出
        import io
        output = io.StringIO()
        writer = csv.writer(output)

        # 写入标题行
        writer.writerow([
            '单词', '音标', '释义', '翻译', '例句', '例句翻译',
            '上下文', '来源文档', '掌握程度', '分类', '标签',
            '复习次数', '是否收藏', '创建时间', '更新时间'
        ])

        # 写入数据行
        for vocab in vocabularies:
            writer.writerow([
                vocab.word,
                vocab.pronunciation or '',
                vocab.definition or '',
                vocab.translation or '',
                vocab.example_sentence or '',
                vocab.example_translation or '',
                vocab.context or '',
                vocab.source_document.title if vocab.source_document else '',
                vocab.mastery_level,
                vocab.category,
                ';'.join(vocab.tags) if vocab.tags else '',
                vocab.review_count,
                '是' if vocab.is_favorite else '否',
                vocab.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                vocab.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            ])

        # 创建响应
        response = HttpResponse(
            output.getvalue().encode('utf-8-sig'),
            content_type='text/csv; charset=utf-8-sig'
        )
        response['Content-Disposition'] = f'attachment; filename="vocabulary_{timezone.now().date()}.csv"'

    return response
