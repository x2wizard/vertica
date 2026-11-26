---
title: vertica-python 소개
description: vertica를 위한 native python client 소개
date: 2025-09-20
lastUpdated: 2025-09-20
tags:
  - vertica-python
  - python
  - 파이썬
  - OpenText Analytics Database(Vertica)
---

## vertica-python
vertica-python는 Uber에서 개발하여 open source로 공개한 vertica를 위한 native python client 이다.  
vertica-python 현재 Python 2.7/3.4/3.5/3.6/3.7/3.8 에서 테스트 완료 되었으며, 최신 버전 및 상세 정보는 <https://github.com/vertica/vertica-python> 에서 확인 할 수 있다.  
  
### vertica-python 설치
online 환경의 경우 아래와 같이 수행하면 설치가 완료 된다.(python 3.4 이후 버전부터 가능)  
```
pip install vertica-python
```

vertica_python을 직접 다운 받아서 진행 할 경우에는 <https://github.com/vertica/vertica-python> 에서 소스를 다운 받아 압축 해제후 root 경로에서 아래와 같이 수행 하면 설치가 완료 된다.  

```
python setup.py install
```


### vertica-python vertica connection
``` python
import vertica_python

conn_info = {'host': '127.0.0.1',  #버티카 접속 host ip
             'port': 5433,         #버티카 접속 port
             'user': 'dbadmin',    #버티카 접속 user
             'password': 'password',  #버티카 접속 user password
             'database': 'test_db',      #버티카 접속 database name
             'session_label': 'some_label', #session label
             #'connection_load_balance': True
             #'backup_server_node': ['1.1.1.2','1.1.1.3','1.1.1.4']
             'log_level': logging.INFO,     #log level
             'log_path': '/home/admin/logs/vClient.log'  #log file path
             'unicode_error': 'strict',     #UTF-8이 아닌 문자열이 있는 경우 처리하는 방법(strict, replace, ignore)
             'ssl': False,                  #SSL connection 옵션
             'use_prepared_statements': False, #False(쿼리 실행을 한번에 여러개 수행 가능) True(prepared statement를 이용한 쿼리 수행)
             'connection_timeout': 5}

# 명시적으로 close() 함수를 호출해야함.
connection = vertica_python.connect(**conn_info)
# 로직
connection.close()

# with 문이 완료 되면 자동으로 close() 함수가 호출됨.
with vertica_python.connect(**conn_info) as connection:
    # 로직
```


### vertica-python select
``` python
import vertica_python

conn_info = {'host': '127.0.0.1',
             'port': 5433,
             'user': 'dbadmin',
             'password': 'password',
             'database': 'test_db'}

connection = vertica_python.connect(**conn_info)

cur = connection.cursor()

#한 row씩 가져오기
cur.execute("select * from tables limit 2")
for row in cur.iterate():
    print(row)

#전체 row 한번에 가져오기(list type)
cur.execute("select * from tables limit 2")
print cur.fetchall()

#전체 row 한번에 가져오기(dictionary type)
cur = connection.cursor('dist')
cur.execute("select * from tables limit 2")
print cur.fetchall()

connection.close()
```


### vertica-python insert
``` python
import vertica_python

conn_info = {'host': '127.0.0.1',
             'port': 5433,
             'user': 'dbadmin',
             'password': 'password',
             'database': 'test_db',
             'use_prepared_statements': True} #True(prepared statement를 이용한 쿼리 수행)

connection = vertica_python.connect(**conn_info)

cur = connection.cursor()

cur.execute("CREATE TABLE IF NOT EXISTS tbl (a INT, b VARCHAR(10))")
cur.execute("INSERT INTO tbl VALUES (?, ?); ", [1, 'aa'])
cur.execute("INSERT INTO tbl VALUES (?, ?); ", [2, 'bb'])
cur.execute("COMMIT;")

cur.execute("SELECT * FROM tbl;")
print cur.fetchall()

connection.close()
```


### vertica-python copy
``` python
import vertica_python

conn_info = {'host': '127.0.0.1',
             'port': 5433,
             'user': 'dbadmin',
             'password': 'password',
             'database': 'test_db',
             'disable_copy_local': False, #copy local을 사용
             'use_prepared_statements': True} #True(prepared statement를 이용한 쿼리 수행)

connection = vertica_python.connect(**conn_info)

cur = connection.cursor()
cur.execute("create table if not exists tbl2(col1 int, col2 varchar(10));")

#적재할 파일이 vertica cluster에 존재 하는 경우
cur.execute("copy tbl2 from "
            " '/tmp/vertica_data.sam' delimiter '|'"
            " rejected data '/tmp/vertica_data.rej'"
            " exceptions '/tmp/vertica_data.exp'"
            , buffer_size=65536
)
print("Rows loaded:", cur.fetchone()[0])

#적재할 파일이 client에 존재 하는 경우
cur.execute("copy tbl2 from local"
            " '/tmp/local_data.sam' delimiter '|'"
            " rejected data '/tmp/local_data.rej'"
            " exceptions '/tmp/local_data.exp'"
            , buffer_size=65536
)
print("Rows loaded:", cur.fetchone()[0])

connection.close()
```


### vertica-python 변수 처리
쿼리에 변수를 사용하는 경우 :변수명 으로 쿼리에서 사용하면된다.  
```
import vertica_python

conn_info = {'host': '127.0.0.1',
             'port': 5433,
             'user': 'dbadmin',
             'password': 'password',
             'database': 'test_db'}

connection = vertica_python.connect(**conn_info)

cur = connection.cursor()

#파라미터 값 설정
parameters = {'p_t_schema': 'public', 'p_t_name': 'tbl'}

#쿼리 실행
cur.execute("select * from tables where table_schema = :p_t_schema and table_name = :p_t_name", parameters)

print(cur.fetchall())
connection.close()
```

### vertica-python insert/update/delete/copy 결과 건수 확인
cur.execute()를 호출한 후 cur.fetchone()[0]를 통해 처리 건수를 확인 할 수 있다.
``` python
cur.execute("insert/update/delete/copy등을 수행")
cur.fetchone()[0] #처리된 건수
```

### vertica-python 상세한 사용법
vertica-python의 상세한 사용법은 vertica github의 vertica-python을 참고 하면 된다. <https://github.com/vertica/vertica-python>
