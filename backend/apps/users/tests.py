from django.urls import reverse
from rest_framework import status
from tests.base import BaseAPITestCase


class UserRegistrationTest(BaseAPITestCase):
    """用户注册测试"""

    def setUp(self):
        self.client.logout()  # 注册测试不需要认证
        self.register_url = reverse('register')

    def test_register_success(self):
        """成功注册"""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(self.user.__class__.objects.filter(email='newuser@example.com').exists())

    def test_register_duplicate_email(self):
        """重复邮箱注册失败"""
        self.user.__class__.objects.create_user(
            email='existing@example.com',
            username='existing',
            password='pass123'
        )
        data = {
            'email': 'existing@example.com',
            'username': 'newuser',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        """密码不匹配"""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'StrongPass123!',
            'password_confirm': 'DifferentPass123!'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserProfileTest(BaseAPITestCase):
    """用户画像测试"""

    def test_get_profile(self):
        """获取用户画像"""
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('education_level', response.data)

    def test_update_profile(self):
        """更新用户画像"""
        data = {
            'education_level': 'graduate',
            'major': '计算机科学',
            'math_level': 4
        }
        response = self.client.patch(reverse('profile'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['major'], '计算机科学')