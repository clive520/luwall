const jwt = require('jsonwebtoken');

const SECRET = '08bc38df41c2e5e557a95554faab585f9878ca4554993c906689fcf8082051420534d15d9fba9d751d3da2a2b08d9f14';

// 1. 建立測試 Token (模擬鹿陽國小 SSO 發送)
const payload = {
  uid: 'test-luyang-student-88',
  username: '113088',
  name: '鹿陽測試生',
  role: 'student',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
};

const token = jwt.sign(payload, SECRET, { algorithm: 'HS256' });
console.log('✔ 產出模擬鹿陽 SSO Token 成功');

// 2. 驗證 Token 解密
try {
  const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
  console.log('✔ Token 解密成功！');
  console.log(`  - UID: ${decoded.uid}`);
  console.log(`  - 姓名: ${decoded.name}`);
  console.log(`  - 學號: ${decoded.username}`);
  console.log(`  - 角色: ${decoded.role}`);
  console.log('SSO 驗證測試全部通過！🎉');
} catch (err) {
  console.error('❌ Token 解密失敗:', err.message);
  process.exit(1);
}
