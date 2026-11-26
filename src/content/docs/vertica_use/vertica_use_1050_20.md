---
title: Bulk-Loading Data(COPY문)
description: 대량 데이터 적재를 위한 COPY에 대한 설명
date: 2026-11-26
tags:
  - 대량 데이터 적재
  - COPY
  - COPY LOCAL
  - COPY DIRECT
  - Vertica Analytics Database(Vertica)
---

## COPY 문
버티카는 대량의 데이터를 DB로 로딩하기 위해 쿼리 레벨에서 제공하는 COPY문을 사용하므로 별도에 유틸리티가 필요 없다.  
COPY 문의 가장 단순한 형태로 다음과 같이 데이터 소스에서 데이터를 테이블에 복사한다. 데이터 소스에는 파일 경로, 데이터 스트림 등이 될 수 있다.  

```sql
--data-source가 버티카 클러스터에 존재하는 경우
COPY target-table FROM data-source ;

--data-source가 클라이언트에 존재하는 경우
COPY target-table FROM LOCAL data-source ;
```
data-source의 위치는 버티카 클러스터, 클라이언트 모두 가능하며, **파일 형식은 UTF8만 지원한다.**(UTF8형식이 아닌 경우 반드시 변환 필요)  

아래 예시는 [숫자\|숫자\|문자열] 형태의 데이터가 저장된 파일을 버티카 테이블에 저장하는 간단한 예이다.  

```sql
--/home/dbadmin/test.txt에 숫자|숫자|문자열 형태의 파일 생성해야함.
dbadmin=> \! cat /home/dbadmin/test.txt
1|10|test1
2|20|test2
3|30|test3
4|40|test4
5|50|test5
6|60|test6

dbadmin=> drop table if exists t cascade;
DROP TABLE
dbadmin=> create table t(col1 int, col2 int, col3 varchar(100));
CREATE TABLE

--copy문을 이용한 데이터 파일 복사
dbadmin=> copy t from '/home/dbadmin/test.txt' ;
Rows Loaded
-------------
           6
(1 row)

dbadmin=> select * from t;
col1 | col2 | col3
------+------+-------
    1 |   10 | test1
    3 |   30 | test3
    4 |   40 | test4
    2 |   20 | test2
    5 |   50 | test5
    6 |   60 | test6
(6 rows)

```

### 컬럼 정의가 데이터 파일과 다를 경우
데이터 파일에 순서와 테이블의 컬럼 순서가 다른 경우 데이터 파일에 맞춰 컬럼명을 직접 명시 하면 된다. 또한 filler 옵션을 이용해 데이터를 가공하거나, 시스템 날짜와 같이 자동으로 생성되는 컬럼에 대해서는 정의하면 된다.
```sql
--/home/dbadmin/test.txt에 아래 형태의 파일 생성해야함.
dbadmin=> \! cat /home/dbadmin/test.txt
ABC|5678|text:Vertica Analytic Database

dbadmin=> drop table if exists t cascade;
NOTICE 4185:  Nothing was dropped
DROP TABLE
dbadmin=> create table t(col1 char(10), col2 number(18,2), col3 varchar(50), col4 DATE);
CREATE TABLE

dbadmin=> COPY t (
dbadmin(>      col1,
dbadmin(>      col2,
dbadmin(>      f_char1 FILLER VARCHAR(100),
dbadmin(>      col3 AS SUBSTRING(f_char1,6),
dbadmin(>      col4 AS SYSDATE
dbadmin(>      )
dbadmin-> FROM '/home/dbadmin/test.txt'
dbadmin-> DIRECT ;
Rows Loaded
-------------
           1
(1 row)

dbadmin=> select * from t;
    col1    |  col2   |           col3            |    col4
------------+---------+---------------------------+------------
ABC        | 5678.00 | Vertica Analytic Database | 2020-03-17
(1 row)

```


### 데이터 구분자(delimiter) 정의
데이터 구분자(delimiter)란 데이터 파일에서 각 컬럼을 구분하는 구분자를 말하며, 버티카의 default 구분자(delimiter)는 파이프 기호인 | 이다.  
**delimiter 키워드를 1byte 문자**로 사용자가 정의 할 수 있으며, 아스키 코드값을 이용하여 특수문자로 정의하는 것이 안전하다.(E'\000' ~ E'\177')  
데이터 값 중에 delimiter문자를 데이터 값으로 인식시키기 위한 escape character가 있을 경우 ESCAPE AS 옵션을 지정한다.  
delimiter문자를 포함한 문자열을 데이터 값으로 인식시키기 위해 ENCLOSED BY옵션으로 지정한 문자로 문자열이 둘러싸여 있으면 문자열 데이터 값으로 인식한다.  
```sql
--/home/dbadmin/test.txt에 아래 형태의 파일 생성해야함.
dbadmin=> \! cat /home/dbadmin/test.txt
AB^5678^abc$^def$^$^^2015-01-01
CD^1234^"a^b^c^d^e^"^2015-01-01

dbadmin=> drop table if exists t cascade;
DROP TABLE
dbadmin=> create table t(col1 char(10), col2 number(18,2), col3 varchar(50), col4 DATE);
CREATE TABLE

dbadmin=> COPY t
dbadmin-> FROM '/home/dbadmin/test.txt'
dbadmin-> DELIMITER '^'
dbadmin-> ESCAPE AS '$'
dbadmin-> ENCLOSED BY '"'
dbadmin-> ENFORCELENGTH
dbadmin-> DIRECT ;
Rows Loaded
-------------
           2
(1 row)

dbadmin=> select * from t;
    col1    |  col2   |    col3    |    col4
------------+---------+------------+------------
CD         | 1234.00 | a^b^c^d^e^ | 2015-01-01
AB         | 5678.00 | abc^def^^  | 2015-01-01
(2 rows)

```

### NULL 데이터 처리
일반적으로 데이터 이관시 SAM파일의 빈문자열('')과 NULL데이터를 구분할 방법이 없다. 또한 버티카는 기본적으로 데이터 파일의 빈문자열('')를 NULL로 로드한다. 
그러므로 NULL데이터를 별도의 NULL데이터임을 알리는 문자열로 치환하여 export 한 후 NULL AS 옵션을 이용하여 NULL데이터를 적재해야 한다.  
```sql
--/home/dbadmin/test.txt에 아래 형태의 파일 생성해야함.
dbadmin=> \! cat /home/dbadmin/test.txt
A|900||2015-03-03

dbadmin=> drop table if exists t cascade;
DROP TABLE
dbadmin=> create table t(col1 char(10), col2 number(18,2), col3 varchar(50), col4 DATE);
CREATE TABLE

dbadmin=> COPY t
dbadmin-> FROM '/home/dbadmin/test.txt'
dbadmin-> DIRECT ;
Rows Loaded
-------------
           1
(1 row)

dbadmin=> SELECT * FROM t WHERE col3 IS NULL;
    col1    |  col2  | col3 |    col4
------------+--------+------+------------
A          | 900.00 |      | 2015-03-03
(1 row)

dbadmin=> SELECT * FROM t WHERE col3 = '';
col1 | col2 | col3 | col4
------+------+------+------
(0 rows)

--/home/dbadmin/test.txt에 아래 형태의 파일 생성해야함.
dbadmin=> \! cat /home/dbadmin/test.txt
A|900||2015-03-03
B|800|NuLL|2015-04-04

dbadmin=> drop table if exists t cascade;
DROP TABLE
dbadmin=> create table t(col1 char(10), col2 number(18,2), col3 varchar(50), col4 DATE);
CREATE TABLE

dbadmin=> COPY t
dbadmin-> FROM '/home/dbadmin/test.txt'
dbadmin-> NULL AS 'NuLL'
dbadmin-> DIRECT ;
Rows Loaded
-------------
           2
(1 row)

dbadmin=> SELECT * FROM t WHERE col3 IS NULL;
    col1    |  col2  | col3 |    col4
------------+--------+------+------------
B          | 800.00 |      | 2015-04-04
(1 row)

dbadmin=> SELECT * FROM t WHERE col3 = '';
    col1    |  col2  | col3 |    col4
------------+--------+------+------------
A          | 900.00 |      | 2015-03-03
(1 row)

```


### 데이터 길이 정합성 체크
데이터 적재시 정합성을 위하여 오류가 발생할 때 COPY문 전체를 ROLLBACK시키려면 ABOORT ON ERROR 옵션을 지정해야 한다.  
또한 정의된 길이보다 데이터가 긴 경우 버티카는 자동으로 문자열을 잘라서 처리한다. 정의된 길이 보다 큰 데이터가 들어오는 경우 ERROR가 발생하도록 하기 위해서는 ENFORCELENGTH 옵션을 지정해야 한다.  
```sql
--/home/dbadmin/test.txt에 아래 형태의 파일 생성해야함.
dbadmin=> \! cat /home/dbadmin/test.txt
abcdefghi|123456|ABCDEFGHIJK|2015-03-03
abcdefghijklm|1234|ABCDEFGHIJK|2015-03-03
abcdefghij|12345|ABCDEFGHIJK|2015-03-03

dbadmin=> drop table if exists t cascade;
DROP TABLE
dbadmin=> create table t(col1 char(10), col2 number(18,2), col3 varchar(50), col4 DATE);
CREATE TABLE

dbadmin=> COPY t
dbadmin-> FROM '/home/dbadmin/test.txt'
dbadmin-> ABORT ON ERROR
dbadmin-> DIRECT 
dbadmin-> NO COMMIT ;
Rows Loaded
-------------
           3
(1 row)

dbadmin=> SELECT * FROM t ;
    col1    |   col2    |    col3     |    col4
------------+-----------+-------------+------------
abcdefghi  | 123456.00 | ABCDEFGHIJK | 2015-03-03
abcdefghij |   1234.00 | ABCDEFGHIJK | 2015-03-03
abcdefghij |  12345.00 | ABCDEFGHIJK | 2015-03-03
(3 rows)


dbadmin=> ROLLBACK ;
ROLLBACK

dbadmin=> COPY t
dbadmin-> FROM '/home/dbadmin/test.txt'
dbadmin-> ENFORCELENGTH
dbadmin-> ABORT ON ERROR
dbadmin-> DIRECT 
dbadmin-> NO COMMIT ;
ERROR 2035:  COPY: Input record 2 has been rejected (The 13-byte value is too long for type Char(10), column 1 (col1))
dbadmin=>
dbadmin=> SELECT * FROM t ;
col1 | col2 | col3 | col4
------+------+------+------
(0 rows)

```

### New Line이 포함된 데이터 로드
export단계에서 불필요한 new line은 제거하거나 모든 데이터 행 끝에 record terminator 문자를 지정하고 copy에 RECORD TERMINATOR 옵션을 사용하면 된다.  
```sql
--/home/dbadmin/test.txt에 아래 형태의 파일 생성해야함.
dbadmin=> \! cat /home/dbadmin/test.txt
abcd|123456|A
B|2015-03-03@ab|12|ABC
DEF|2015-06-06@

dbadmin=> drop table if exists t cascade;
DROP TABLE
dbadmin=> create table t(col1 char(10), col2 number(18,2), col3 varchar(50), col4 DATE);
CREATE TABLE

dbadmin=> COPY t
dbadmin-> FROM '/home/dbadmin/test.txt'
dbadmin-> RECORD TERMINATOR '@' DIRECT ;
Rows Loaded
-------------
           2
(1 row)

dbadmin=> SELECT * FROM t ;
    col1    |   col2    |  col3   |    col4
------------+-----------+---------+------------
abcd       | 123456.00 | A
B     | 2015-03-03
ab         |     12.00 | ABC
DEF | 2015-06-06
(2 rows)

```

### 오류 데이터 및 오류 메시지 저장
기본적으로 오류 데이터는 제외되고 데이터가 로드된다. ABORT ON ERROR옵션을 추가하여 오류 데이터가 발생하면 전체 COPY가 ROLLBACK 될 수 있게 할 수 있다.  
대량 데이터 적재중에 일부 오류가 발생하는 데이터들 때문에 적재 작업 전체를 ROLLBACK하는 것은 비효율적이므로 오류 데이터만 따로 보관하여 오류 원인 파악 및 조치 후 해당 데이터만 적재하도록 할 수 있다.  
REJECTED DATA(오류 데이터 저장) 옵션, EXCEPTION(오류 발생 원인 저장) 옵션을 지정하면 된다. REJECTED DATA는 파일 또는 테이블(자동생성됨)에 저장 할 수 있다.  
오류 데이터가 너무 많으면 오류 데이터를 저장하는데 시간과 리소스를 많이 소비하게 되므로 REJECTMAX 옵션을 지정하여 오류 건수를 제한 할 수 있다. 지정한 오류 건수 이상으로 오류가 발생하면 해당 로드 작업은 error를 발생하게 된다.  
```sql
--/home/dbadmin/test.txt에 아래 형태의 파일 생성해야함.
dbadmin=> \! cat /home/dbadmin/test.txt
a|200|A|2015-07-01
b|X00|B|2015-07-02
c|500|C|2015-07-03|abc
b|600|D|2015-07-32
e|700|D|2015-07-05

dbadmin=> drop table if exists t cascade;
DROP TABLE
dbadmin=> create table t(col1 char(10), col2 number(18,2), col3 varchar(50), col4 DATE);
CREATE TABLE

dbadmin=> COPY t
dbadmin-> FROM '/home/dbadmin/test.txt'
dbadmin-> REJECTED DATA  '/home/dbadmin/test.reject'
dbadmin-> EXCEPTIONS     '/home/dbadmin/test.exception'
dbadmin-> DIRECT ;
NOTICE 7850:  In a multi-threaded load, rejected record data may be written to additional files
HINT:  Exceptions may be written to files [/home/dbadmin/test.exception], [/home/dbadmin/test.exception.1], etc
Rows Loaded
-------------
           2
(1 row)

dbadmin=> SELECT * FROM t ;
    col1    |  col2  | col3 |    col4
------------+--------+------+------------
e          | 700.00 | D    | 2015-07-05
a          | 200.00 | A    | 2015-07-01
(2 rows)

--reject데이터 확인
dbadmin=> \! cat /home/dbadmin/test.reject
b|X00|B|2015-07-02
c|500|C|2015-07-03|abc
b|600|D|2015-07-32

--exception 내용 확인
dbadmin=> \! cat /home/dbadmin/test.exception
COPY: Input record 2 has been rejected (Invalid numeric format 'X00' for column 2 (col2)).  Please see /home/dbadmin/test.reject, record 1 for the rejected record.
COPY: Input record 3 has been rejected (Too many columns found).  Please see /home/dbadmin/test.reject, record 2 for the rejected record.
COPY: Input record 4 has been rejected (Invalid date format '2015-07-32' for column 4 (col4).Date/time field value out of range: "2015-07-32").  Please see /home/dbadmin/test.reject, record 3 for the rejected record.
COPY: Loaded 2 rows, rejected 3 rows.


--REJECTED DATA를 테이블에 저장하는 경우
dbadmin=> COPY t FROM '/home/dbadmin/test.txt'
dbadmin-> REJECTED DATA AS TABLE copy_test_exception
dbadmin-> DIRECT ;
Rows Loaded
-------------
           2
(1 row)

--reject테이블 확인
dbadmin=> SELECT file_name,row_number,rejected_data,rejected_reason
dbadmin->   FROM copy_test_exception ;
       file_name        | row_number |     rejected_data      |                                            rejected_reason
------------------------+------------+------------------------+-------------------------------------------------------------------------------------------------------
/home/dbadmin/test.txt |          2 | b|X00|B|2015-07-02     | Invalid numeric format 'X00' for column 2 (col2)
/home/dbadmin/test.txt |          3 | c|500|C|2015-07-03|abc | Too many columns found
/home/dbadmin/test.txt |          4 | b|600|D|2015-07-32     | Invalid date format '2015-07-32' for column 4 (col4).Date/time field value out of range: "2015-07-32"
(3 rows)

```
