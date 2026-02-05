# Mobile App Integration Examples

## 📱 Ví dụ code cho React Native / Flutter

### 0. Đăng nhập với thông tin thiết bị

#### React Native Example:
```typescript
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const login = async (username: string, password: string) => {
  try {
    // Lấy thông tin thiết bị
    const deviceName = await DeviceInfo.getDeviceName();
    const deviceType = Platform.OS; // 'ios' or 'android'
    const osVersion = await DeviceInfo.getSystemVersion();
    const userAgent = await DeviceInfo.getUserAgent();
    
    // Gọi API login với thông tin thiết bị
    const response = await fetch('http://your-api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        // Thông tin thiết bị (optional nhưng nên gửi)
        deviceType: deviceType === 'ios' ? 'mobile' : 'mobile',
        deviceName,
        os: `${Platform.OS} ${osVersion}`,
        userAgent,
        browser: Platform.OS === 'ios' ? 'Safari' : 'Chrome',
        // ipAddress và location có thể lấy từ API khác hoặc để backend tự detect
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      // Lưu token
      await AsyncStorage.setItem('accessToken', data.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('Login successful!');
      console.log('Session ID:', data.sessionId);
      
      return data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

**Cài đặt thư viện:**
```bash
npm install react-native-device-info
# hoặc
yarn add react-native-device-info
```

---

### 1. Màn hình "Lịch sử đăng nhập"

#### React Native Example:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

interface LoginHistory {
  _id: string;
  userId: {
    hoTen: string;
    maNhanVien: string;
  };
  loginTime: string;
  deviceName: string;
  os: string;
}

const LoginHistoryScreen = () => {
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoginHistory();
  }, []);

  const fetchLoginHistory = async () => {
    try {
      const response = await fetch('http://your-api/auth/login-history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: LoginHistory }) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📱</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.employeeCode}>{item.userId.maNhanVien}</Text>
        <Text style={styles.employeeName}>{item.userId.hoTen}</Text>
        <Text style={styles.time}>
          ⏰ {new Date(item.loginTime).toLocaleString('vi-VN')}
        </Text>
        <Text style={styles.device}>📱 {item.deviceName}</Text>
      </View>
      <View style={styles.checkIcon}>
        <Text>✅</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Lịch sử</Text>
      <Text style={styles.total}>Tổng: {history.length} lần</Text>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={fetchLoginHistory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  total: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  employeeCode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  device: {
    fontSize: 12,
    color: '#999',
  },
  checkIcon: {
    marginLeft: 8,
  },
});

export default LoginHistoryScreen;
```

---

### 2. Màn hình "Lịch sử tiến trình lệnh"

#### React Native Example:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

interface ProgressHistory {
  maLenh: string;
  thoiGian: string;
  trangThaiHienTai: {
    trangThai: string;
    thoiGian: string;
    nguoiThucHien: {
      hoTen: string;
    };
  };
  trangThaiTruoc: {
    trangThai: string;
  } | null;
  nguoiThayDoiCuoi: {
    hoTen: string;
  };
}

const ProgressHistoryScreen = () => {
  const [history, setHistory] = useState<ProgressHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressHistory();
  }, []);

  const fetchProgressHistory = async () => {
    try {
      const response = await fetch('http://your-api/sample-collections/history/grouped');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching progress history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CHO_DIEU_PHOI: 'Chờ xử lý',
      DANG_THUC_HIEN: 'Đang xử lý',
      HOAN_THANH: 'Hoàn thành',
      HOAN_THANH_KIEM_TRA: 'Hoàn thành kiểm tra',
      DA_HUY: 'Đã hủy',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CHO_DIEU_PHOI: '#ffc107',
      DANG_THUC_HIEN: '#2196f3',
      HOAN_THANH: '#4caf50',
      HOAN_THANH_KIEM_TRA: '#00bcd4',
      DA_HUY: '#f44336',
    };
    return colors[status] || '#666';
  };

  const renderItem = ({ item }: { item: ProgressHistory }) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📋</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.orderCode}>{item.maLenh}</Text>
        <Text style={styles.time}>
          {new Date(item.thoiGian).toLocaleString('vi-VN')}
        </Text>
        
        <View style={styles.statusContainer}>
          {item.trangThaiTruoc && (
            <>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.trangThaiTruoc.trangThai) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(item.trangThaiTruoc.trangThai) },
                  ]}
                >
                  {getStatusLabel(item.trangThaiTruoc.trangThai)}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </>
          )}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.trangThaiHienTai.trangThai) + '20' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.trangThaiHienTai.trangThai) },
              ]}
            >
              {getStatusLabel(item.trangThaiHienTai.trangThai)}
            </Text>
          </View>
        </View>

        <Text style={styles.person}>
          👤 Người thay đổi: {item.nguoiThayDoiCuoi.hoTen}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Lịch sử</Text>
      <Text style={styles.total}>Tổng: {history.length} bản ghi</Text>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.maLenh}
        refreshing={loading}
        onRefresh={fetchProgressHistory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  total: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  orderCode: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  arrow: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#666',
  },
  person: {
    fontSize: 12,
    color: '#666',
  },
});

export default ProgressHistoryScreen;
```

---

### 3. Flutter Example (Bonus)

```dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ProgressHistoryScreen extends StatefulWidget {
  @override
  _ProgressHistoryScreenState createState() => _ProgressHistoryScreenState();
}

class _ProgressHistoryScreenState extends State<ProgressHistoryScreen> {
  List<dynamic> history = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    fetchProgressHistory();
  }

  Future<void> fetchProgressHistory() async {
    try {
      final response = await http.get(
        Uri.parse('http://your-api/sample-collections/history/grouped'),
      );
      
      if (response.statusCode == 200) {
        setState(() {
          history = json.decode(response.body);
          loading = false;
        });
      }
    } catch (e) {
      print('Error: $e');
      setState(() => loading = false);
    }
  }

  String getStatusLabel(String status) {
    const labels = {
      'CHO_DIEU_PHOI': 'Chờ xử lý',
      'DANG_THUC_HIEN': 'Đang xử lý',
      'HOAN_THANH': 'Hoàn thành',
      'HOAN_THANH_KIEM_TRA': 'Hoàn thành kiểm tra',
      'DA_HUY': 'Đã hủy',
    };
    return labels[status] ?? status;
  }

  Color getStatusColor(String status) {
    const colors = {
      'CHO_DIEU_PHOI': Colors.orange,
      'DANG_THUC_HIEN': Colors.blue,
      'HOAN_THANH': Colors.green,
      'HOAN_THANH_KIEM_TRA': Colors.cyan,
      'DA_HUY': Colors.red,
    };
    return colors[status] ?? Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Lịch sử'),
        centerTitle: true,
      ),
      body: loading
          ? Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'Tổng: ${history.length} bản ghi',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    padding: EdgeInsets.all(16),
                    itemCount: history.length,
                    itemBuilder: (context, index) {
                      final item = history[index];
                      return Card(
                        margin: EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: Colors.blue[50],
                                child: Text('📋', style: TextStyle(fontSize: 24)),
                              ),
                              SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item['maLenh'],
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      DateTime.parse(item['thoiGian'])
                                          .toLocal()
                                          .toString(),
                                      style: TextStyle(
                                        color: Colors.grey,
                                        fontSize: 12,
                                      ),
                                    ),
                                    SizedBox(height: 8),
                                    Row(
                                      children: [
                                        if (item['trangThaiTruoc'] != null) ...[
                                          Chip(
                                            label: Text(
                                              getStatusLabel(
                                                item['trangThaiTruoc']['trangThai'],
                                              ),
                                              style: TextStyle(fontSize: 12),
                                            ),
                                            backgroundColor: getStatusColor(
                                              item['trangThaiTruoc']['trangThai'],
                                            ).withOpacity(0.2),
                                          ),
                                          Text(' → '),
                                        ],
                                        Chip(
                                          label: Text(
                                            getStatusLabel(
                                              item['trangThaiHienTai']['trangThai'],
                                            ),
                                            style: TextStyle(fontSize: 12),
                                          ),
                                          backgroundColor: getStatusColor(
                                            item['trangThaiHienTai']['trangThai'],
                                          ).withOpacity(0.2),
                                        ),
                                      ],
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      '👤 ${item['nguoiThayDoiCuoi']['hoTen']}',
                                      style: TextStyle(
                                        color: Colors.grey,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
```

---

## 🎯 API Endpoints Summary

### Lịch sử đăng nhập:
```
GET /auth/login-history
```

### Lịch sử tiến trình lệnh:
```
GET /sample-collections/history/grouped  ← RECOMMENDED cho mobile
GET /sample-collections/history/all      ← Raw data
GET /sample-collections/:id/history      ← Lịch sử của 1 lệnh cụ thể
```

---

## 📝 Notes

- Tất cả API đều trả về JSON
- Sắp xếp theo thời gian giảm dần (mới nhất lên đầu)
- API `/history/grouped` đã format sẵn cho UI mobile
- Có thể thêm pagination nếu cần (hiện tại limit 100-500 records)
