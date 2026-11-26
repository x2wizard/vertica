---
title: vsql을 이용한 데이터 Export
description: vsql을 이용한 데이터를 export 방법
date: 2025-09-20
lastUpdated: 2025-09-20
tags:
  - export
  - vsql
  - OpenText Analytics Database(Vertica)
---

## 버티카 데이터 Export
테이블, 쿼리 수행 결과 등 데이터를 export하는 방법은 아래와 같이 존재한다.  
+ **plaintext로 저장 : 쿼리 결과를 파일로 저장(vsql -o 옵션 이용)**  
+ 버티카로 전송 : export to vertica, copy from vertica를 통해 다른 버티카 클러스터로 데이터 전송  
+ parquet파일 포멧으로 저장 : 쿼리 결과를 parquet파일로 저장(export to parquet 이용)  

이번 포스터에서는 vsql을 이용해서 쿼리 결과를 plaintext 파일로 저장하는 방법에 대해서 소개한다.  
vsql을 접속하기 위해 사용하는 ssh툴의 character set은 UTF-8로 설정하여야 한다.  
  
데이터를 export하기 위해서는 컬럼 구분자, 레코드 구분자 등을 설정해야 한다. 이러한 설정을 vsql 의 옵션으로 지정이 가능하다.  

|vsql 옵션 | 메타 명령어 | 커맨드라인 명령어 |
|:---------------:|:-------|:-------------|:-----------|
|데이터 공백 제거   |\a     |-A or --no-align      ||
|데이터만 출력      |\t     |-t or --tuples-only   ||
|필드 구분자 설정   |\pset fieldsep |-F or -Pfieldsep|* format 이 unaligned 로 설정되어야 구분자 설정 변경 가능<br/>\pset format unaligned |
|레코드 구분자 설정 |\pset recordsep |-R or -Precordsep ||
|출력 파일 설정    |\o    |-o or --output  ||
|SQL 구문        |N/A    |-c or --command  ||
|SQL 파일        |N/A    |-f or --file ||


### vsql 메타 명령어
```sql
[dbadmin@vnode1 ~]$ vsql -wpassword
Welcome to vsql, the Vertica Analytic Database interactive terminal.

Type:  \h or \? for help with vsql commands
       \g or terminate with semicolon to execute query
       \q to quit

dbadmin=> select * from t;
col1 | col2 | col3
------+------+------
    1 | aaa  |   11
    2 | bbb  |   22
    3 | ccc  |   33
(3 rows)
dbadmin=>
dbadmin=> --\a \t 공백 제거한 데이터만 출력
dbadmin=> \a
Output format is unaligned.
dbadmin=> \t
Showing only tuples.
dbadmin=>
dbadmin=> select * from t;
2|bbb|22
3|ccc|33
1|aaa|11
dbadmin=>
dbadmin=> --\o 출력 결과 파일로 저장
dbadmin=> \o /tmp/t.sam
dbadmin=> select * from t;
dbadmin=> \!cat /tmp/t.sam
2|bbb|22
3|ccc|33
1|aaa|11
dbadmin=> --\o 출력 결과 파일로 저장 off
dbadmin=> \o
```
  
```sql
dbadmin=> -- 구분자 지정을 위해 \pset format unaligned 설정
dbadmin=> \pset format unaligned
Output format is unaligned.
dbadmin=> --필드 구분자 지정
dbadmin=> \pset fieldsep #
Field separator is "#".
dbadmin=> select * from t;
2#bbb#22
3#ccc#33
1#aaa#11
dbadmin=>
dbadmin=> --레코드 구분자 지정
dbadmin=> \pset recordsep ^
Record separator is "^".
dbadmin=> select * from t;
2#bbb#22^3#ccc#33^1#aaa#11
dbadmin=>
dbadmin=> --필드 구분자를 control character ESC로 지정하는 경우 '\003'로 지정해야한다.
dbadmin=> \pset fieldsep '\033'
Field separator is "
dbadmin=> select * from t;

```

### vsql 커맨드라인 명령어
```bash
#-c 옵션으로 쿼리 수행
[dbadmin@vnode1 ~]$ vsql -wpassword -c'select * from t;'
col1 | col2 | col3
------+------+------
    1 | aaa  |   11
    2 | bbb  |   22
    3 | ccc  |   33
(3 rows)

#-At옵션으로 공백 제거한 데이터만 출력
[dbadmin@vnode1 ~]$ vsql -wpassword -c'select * from t;' -At
2|bbb|22
3|ccc|33
1|aaa|11

#-o옵션으로 출력 결과 파일로 저장
[dbadmin@vnode1 ~]$ vsql -wpassword -c'select * from t;' -At -o'/tmp/t.sam'
[dbadmin@vnode1 ~]$ cat /tmp/t.sam
2|bbb|22
3|ccc|33
1|aaa|11
```

```bash
#-F옵션으로 필드 구분자 지정
[dbadmin@vnode1 ~]$ vsql -wpassword -c'select * from t;' -At -F'#' -o'/tmp/t.sam'
[dbadmin@vnode1 ~]$ cat /tmp/t.sam
1#aaa#11
2#bbb#22
3#ccc#33

#필드 구분자를 control character ESC로 지정하는 경우 $'\003'로 지정해야한다.
[dbadmin@vnode1 ~]$ vsql -wpassword -c'select * from t;' -At -F$'\033' -o'/tmp/t.sam'
[dbadmin@vnode1 ~]$ vi /tmp/t.sam
1^[aaa^[11
2^[bbb^[22
3^[ccc^[33

#-f옵션으로 쿼리를 별도에 파일로 저장해서 실행
[dbadmin@vnode1 ~]$ cat /tmp/t.sql
select * from t;
[dbadmin@vnode1 ~]$ vsql -wpassword -f'/tmp/t.sql' -At -o'/tmp/t.sam'
[dbadmin@vnode1 ~]$ cat /tmp/t.sam
1|aaa|11
2|bbb|22
3|ccc|33
```
