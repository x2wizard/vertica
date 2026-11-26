---
title: projection 생성 시점
description: projection의 생성 시점에 대한 설명
date: 2026-11-26
tags:
  - projection
  - 프로젝션
  - projection 생성
  - 프로젝션 생성
  - Vertica Analytics Database(Vertica)
---

## projection이 생성되는 시점
projection이 생성되는 시점은 아래와 같다.  
+ 테이블 생성 후 최초 데이터 저장 시점
+ 테이블 생성시 프로젝션 속성을 함께 지정하는 경우(에> order by, segmentation-spec, ksafe등)
+ 명시적으로 프로젝션을 생성하는 시점
+ Database Designer(DBD)에 의해 생성하는 경우

### 테이블 생성 후 최초 데이터 저장 시점
```sql
dbadmin=> create table t1(col1 int, col2 int);
CREATE TABLE

dbadmin=> insert into t1 values(1, 1);
OUTPUT
--------
      1
(1 row)

--테이블 생성 확인
dbadmin=> select table_name from tables where table_name = 't1';
table_name
------------
t1
(1 row)

--projection 생성 확인
dbadmin=> select anchor_table_name, projection_name from projections where anchor_table_name = 't1';
anchor_table_name | projection_name
-------------------+-----------------
t1                | t1_b1
t1                | t1_b0
(2 rows)

--테이블 관련 object DDL문 확인
dbadmin=> select export_objects('', 't1');
export_objects                                                  
----------------------------------------------------------------
CREATE TABLE public.t1
(
    col1 int,
    col2 int
);

CREATE PROJECTION public.t1 /*+createtype(L)*/
(
col1,
col2
)
AS
SELECT t1.col1,
        t1.col2
FROM public.t1
ORDER BY t1.col1,
          t1.col2
SEGMENTED BY hash(t1.col1, t1.col2) ALL NODES KSAFE 1;

SELECT MARK_DESIGN_KSAFE(1);

(1 row)
```

### 테이블 생성시 프로젝션 속성을 함께 지정하는 경우(order by, segmentation-spec, ksafe등)
```sql
dbadmin=> create table t2(col1 int, col2 int) order by col1 segmented by hash(col1) all nodes ;
CREATE TABLE

--테이블 생성 확인
dbadmin=> select table_name from tables where table_name = 't2';
table_name
------------
t2
(1 row)

--projection 생성 확인
dbadmin=> select anchor_table_name, projection_name from projections where anchor_table_name = 't2';
anchor_table_name | projection_name
-------------------+-----------------
t2                | t2_b1
t2                | t2_b0
(2 rows)

--테이블 관련 object DDL문 확인
dbadmin=> select export_objects('', 't2');
export_objects                                                  
----------------------------------------------------------------
CREATE TABLE public.t2
(
    col1 int,
    col2 int
);

CREATE PROJECTION public.t2 /*+createtype(P)*/
(
col1,
col2
)
AS
SELECT t2.col1,
        t2.col2
FROM public.t2
ORDER BY t2.col1
SEGMENTED BY hash(t2.col1) ALL NODES KSAFE 1;

SELECT MARK_DESIGN_KSAFE(1);

(1 row)
```


### 명시적으로 프로젝션을 생성하는 시점
```sql
dbadmin=> create table t3(col1 int, col2 int) ;
CREATE TABLE

--projection 생성
dbadmin=> create projection t3_super as select t3.col1, t3.col2 from t3 order by t3.col1 segmented by hash(t3.col1) all nodes;
CREATE PROJECTION

--테이블 생성 확인
dbadmin=> select table_name from tables where table_name = 't3';
table_name
------------
t3
(1 row)

--projection 생성 확인
dbadmin=> select anchor_table_name, projection_name from projections where anchor_table_name = 't3';
anchor_table_name | projection_name
-------------------+-----------------
t3                | t3_super_b1
t3                | t3_super_b0
(2 rows)

--테이블 관련 object DDL문 확인
dbadmin=> select export_objects('', 't3');
export_objects                                                  
----------------------------------------------------------------
CREATE TABLE public.t3
(
    col1 int,
    col2 int
);

CREATE PROJECTION public.t3_super
(
col1,
col2
)
AS
SELECT t3.col1,
        t3.col2
FROM public.t3
ORDER BY t3.col1
SEGMENTED BY hash(t3.col1) ALL NODES KSAFE 1;

SELECT MARK_DESIGN_KSAFE(1);
(1 row)
```
