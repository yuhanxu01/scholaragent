from rest_framework import serializers
from .models import Vocabulary, VocabularyReview, VocabularyList, VocabularyListMembership


class VocabularySerializer(serializers.ModelSerializer):
    """生词序列化器"""
    source_document_title = serializers.CharField(source='source_document.title', read_only=True)
    age_days = serializers.SerializerMethodField()
    review_status = serializers.SerializerMethodField()

    class Meta:
        model = Vocabulary
        fields = [
            'id', 'word', 'pronunciation', 'definition', 'translation',
            'example_sentence', 'example_translation', 'primary_language',
            'secondary_language', 'source_document', 'source_document_title',
            'context', 'mastery_level', 'review_count', 'last_reviewed_at',
            'is_favorite', 'category', 'tags', 'created_at', 'updated_at',
            'age_days', 'review_status'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'review_count', 'last_reviewed_at']

    def get_age_days(self, obj):
        """获取单词创建天数"""
        from django.utils import timezone
        if obj.created_at:
            return (timezone.now() - obj.created_at).days
        return 0

    def get_review_status(self, obj):
        """获取复习状态"""
        if obj.review_count == 0:
            return 'new'
        elif obj.mastery_level >= 4:
            return 'mastered'
        elif obj.last_reviewed_at:
            from django.utils import timezone
            days_since_review = (timezone.now() - obj.last_reviewed_at).days
            if days_since_review > 7:
                return 'need_review'
            else:
                return 'reviewed'
        return 'new'


class VocabularyCreateSerializer(serializers.ModelSerializer):
    """创建生词序列化器"""

    class Meta:
        model = Vocabulary
        fields = [
            'word', 'pronunciation', 'definition', 'translation',
            'example_sentence', 'example_translation', 'primary_language',
            'secondary_language', 'source_document', 'context', 'category', 'tags'
        ]

    def validate_word(self, value):
        """验证单词格式"""
        word = value.strip().lower()
        if not word:
            raise serializers.ValidationError("单词不能为空")
        if len(word) > 100:
            raise serializers.ValidationError("单词长度不能超过100个字符")

        # 检查是否已存在
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if Vocabulary.objects.filter(user=request.user, word=word).exists():
                raise serializers.ValidationError("该单词已存在于生词本中")

        return word

    def create(self, validated_data):
        """创建生词记录"""
        user = self.context['request'].user
        validated_data['user'] = user

        # 从词典自动填充信息
        word = validated_data.get('word', '').strip()
        if word:
            # 使用vocabulary_views中的词典实例
            try:
                from .vocabulary_views import get_dictionary_instance
                dictionary = get_dictionary_instance()
                if dictionary:
                    dict_result = dictionary.lookup_word(word)
                    if dict_result:
                        validated_data.setdefault('pronunciation', dict_result.get('pronunciation', ''))
                        validated_data.setdefault('definition', dict_result.get('definition', ''))
                        validated_data.setdefault('translation', dict_result.get('translation', ''))
                        if dict_result.get('examples'):
                            validated_data.setdefault('example_sentence', dict_result['examples'][0])
            except Exception as e:
                logger.warning(f"从词典获取单词信息失败: {e}")

        return super().create(validated_data)


class VocabularyReviewSerializer(serializers.ModelSerializer):
    """生词复习记录序列化器"""
    vocabulary_word = serializers.CharField(source='vocabulary.word', read_only=True)

    class Meta:
        model = VocabularyReview
        fields = [
            'id', 'vocabulary', 'vocabulary_word', 'is_correct',
            'response_time', 'difficulty_rating', 'review_type', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class VocabularyListSerializer(serializers.ModelSerializer):
    """生词列表序列化器"""
    word_count_display = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = VocabularyList
        fields = [
            'id', 'name', 'description', 'is_public', 'is_default',
            'word_count', 'mastered_count', 'word_count_display',
            'progress_percentage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'word_count', 'mastered_count']

    def get_word_count_display(self, obj):
        """获取单词数量显示"""
        return f"{obj.mastered_count}/{obj.word_count}"

    def get_progress_percentage(self, obj):
        """获取掌握进度百分比"""
        if obj.word_count == 0:
            return 0
        return round((obj.mastered_count / obj.word_count) * 100, 1)


class VocabularyListCreateSerializer(serializers.ModelSerializer):
    """创建生词列表序列化器"""

    class Meta:
        model = VocabularyList
        fields = ['name', 'description', 'is_public']

    def create(self, validated_data):
        """创建生词列表"""
        user = self.context['request'].user
        validated_data['user'] = user

        # 如果用户没有默认列表，设置为默认
        if not VocabularyList.objects.filter(user=user, is_default=True).exists():
            validated_data['is_default'] = True

        return super().create(validated_data)


class DictionaryLookupSerializer(serializers.Serializer):
    """词典查询序列化器"""
    word = serializers.CharField(max_length=200)
    suggestions = serializers.ListField(child=serializers.CharField(), read_only=True)
    definition = serializers.CharField(read_only=True)
    pronunciation = serializers.CharField(read_only=True)
    translation = serializers.CharField(read_only=True)
    examples = serializers.ListField(child=serializers.CharField(), read_only=True)
    is_fuzzy_match = serializers.BooleanField(read_only=True)
    source = serializers.CharField(read_only=True)


class VocabularySearchSerializer(serializers.Serializer):
    """生词搜索序列化器"""
    query = serializers.CharField(max_length=200, required=False)
    search = serializers.CharField(max_length=200, required=False)
    category = serializers.ChoiceField(
        choices=[('all', '全部')] + Vocabulary._meta.get_field('category').choices,
        default='all'
    )
    mastery_level = serializers.IntegerField(min_value=1, max_value=5, required=False)
    is_favorite = serializers.BooleanField(required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    sort_by = serializers.ChoiceField(
        choices=[
            ('created_at', '创建时间'),
            ('word', '单词'),
            ('mastery_level', '掌握程度'),
            ('review_count', '复习次数')
        ],
        default='created_at'
    )
    sort_order = serializers.ChoiceField(
        choices=[('asc', '升序'), ('desc', '降序')],
        default='desc'
    )

    def validate(self, attrs):
        """验证并处理搜索参数"""
        # 如果提供了search参数，使用它作为query
        if 'search' in attrs and attrs['search']:
            attrs['query'] = attrs['search']
        elif 'query' in attrs and attrs['query']:
            # query已经存在，继续使用
            pass
        else:
            # 如果两个参数都没有或者都为空，设置为空字符串
            attrs['query'] = ''

        return attrs
