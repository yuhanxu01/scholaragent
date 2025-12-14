import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, Eye, EyeOff, Heart, Tag, X } from 'lucide-react';
import { useDocumentStore } from '../../stores/documentStore';
import { cn } from '../../utils/cn';

interface DocumentUploadProps {
  onSuccess?: () => void;
}

export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'private' | 'public' | 'favorite'>('private');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const uploadDocument = useDocumentStore((state) => state.uploadDocument);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      // 自动设置标题（如果用户没有手动输入）
      const finalTitle = title || file.name.rsplit('.', 1)[0];

      await uploadDocument(file, {
        title: finalTitle,
        privacy,
        tags,
        description
      });
      onSuccess?.();

      // 重置表单
      setTitle('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setPrivacy('private');
    } catch (err: any) {
      setError(err.response?.data?.file?.[0] || err.response?.data?.detail || '上传失败');
    } finally {
      setUploading(false);
    }
  }, [uploadDocument, onSuccess, title, privacy, tags, description]);

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.trim());
      setTagInput('');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md'],
      'text/x-tex': ['.tex'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  return (
    <div className="space-y-6">
      {/* 拖拽上传区域 */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400',
          uploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400">正在上传...</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 mb-2">
                {isDragActive ? '释放以上传文件' : '拖拽文件到此处，或点击选择'}
              </p>
              <p className="text-sm text-gray-500">
                支持 .md, .tex 文件，最大 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* 高级设置 */}
      <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100"
        >
          {showAdvanced ? '收起高级设置' : '展开高级设置'}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                文档标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="留空将使用文件名"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={uploading}
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                文档描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述文档内容..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={uploading}
              />
            </div>

            {/* 隐私设置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                隐私设置
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="private"
                    checked={privacy === 'private'}
                    onChange={(e) => setPrivacy(e.target.value as 'private')}
                    disabled={uploading}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-600">私有</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="public"
                    checked={privacy === 'public'}
                    onChange={(e) => setPrivacy(e.target.value as 'public')}
                    disabled={uploading}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <Eye className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-600">公开</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="favorite"
                    checked={privacy === 'favorite'}
                    onChange={(e) => setPrivacy(e.target.value as 'favorite')}
                    disabled={uploading}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <Heart className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-600">收藏</span>
                </label>
              </div>
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                标签 <span className="text-gray-500 dark:text-gray-500">({tags.length}/10)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-primary-600"
                      disabled={uploading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                placeholder="输入标签后按回车添加"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={uploading || tags.length >= 10}
              />
            </div>
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}