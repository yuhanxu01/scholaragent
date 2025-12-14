import io
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from tests.base import BaseAPITestCase, mock_llm_client


class DocumentUploadTest(BaseAPITestCase):
    """文档上传测试"""

    def test_upload_markdown(self):
        """上传Markdown文件"""
        content = b'# Test Document\n\nThis is a test.'
        file = SimpleUploadedFile('test.md', content, content_type='text/markdown')

        with patch('apps.documents.tasks.process_document_task.delay'):
            response = self.client.post(
                '/api/documents/',
                {'file': file},
                format='multipart'
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['data']['title'], 'test')
        self.assertEqual(response.data['data']['file_type'], 'md')

    def test_upload_invalid_type(self):
        """上传不支持的文件类型"""
        file = SimpleUploadedFile('test.exe', b'content', content_type='application/exe')

        response = self.client.post(
            '/api/documents/',
            {'file': file},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_too_large(self):
        """上传过大的文件"""
        content = b'x' * (11 * 1024 * 1024)  # 11MB
        file = SimpleUploadedFile('test.md', content)

        response = self.client.post(
            '/api/documents/',
            {'file': file},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DocumentProcessingTest(BaseAPITestCase):
    """文档处理测试"""

    @patch('core.llm.get_llm_client')
    def test_process_document(self, mock_llm):
        """测试文档处理流程"""
        mock_llm.generate = mock_llm_client().generate

        # 创建文档
        from apps.documents.models import Document
        doc = Document.objects.create(
            user=self.user,
            title='Test',
            file_type='md',
            status='processing'
        )
        doc.raw_content = '# Test\n\nContent here'
        doc.save()

        # 执行处理任务（同步）
        from apps.documents.tasks import process_document_task
        process_document_task(str(doc.id))

        # 验证结果
        doc.refresh_from_db()
        self.assertEqual(doc.status, 'ready')
        self.assertIsNotNone(doc.index_data)
        self.assertTrue(doc.chunks.exists())
