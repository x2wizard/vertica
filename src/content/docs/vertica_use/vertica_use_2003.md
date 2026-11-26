---
title: 버티카 Database 통계 정보 수집
description: 버티카 Database 통계 정보 수집 및 실행계획 확인
date: 2025-09-20
lastUpdated: 2025-09-20
tags:
  - 통계정보
  - OpenText Analytics Database(Vertica)
---

## 버티카 Database 통계 정보 수집
버티카의 cost-based 옵티마이저는 쿼리 실행계획을 작성하기 위해 통계 정보에 의존한다. 통계정보가 존재하지 않거나, 오래된 통계 정보를 사용하는 경우, 최적화된 실행계획을 만들 수 없다.  
  
버티카 옵티마이저는 다음과 같은 통계 정보를 확인해서 쿼리의 실행계획을 작성한다.  
+ 테이블이 파티션된 경우, 파티션의 최근 통계 정보 확인  
+ 테이블 레벨의 통계 정보 확인  
+ 파티션, 테이블 레벨의 유효한 통계 정보가 없는 경우 옵티마이저는 모든 프로젝션에 대해 균일한 데이터 값 분배 및 동일한 스토리지 사용으로 가정  

### 통계 정보 관리
버티카는 테이블, 파티션 레벨로 통계를 수집한다.
+ 테이블 레벨의 통계 - ANALYZE_STATISTICS()  
+ 파티션 레벨의 통계 - ANALYZE_STATISTICS_PARTITION()  

통계정보 여부는 projection_columns 테이블의 staticstics_type컬럼에서 확인 할 수 있다.  

### ANALYZE_STATISTICS()
대상 테이블의 projection을 저장하는 모든 노드에서 데이터 샘플과 스토리지 정보를 수집하고 집계한다.  
ANALYZE_STATISTICS()호출시 특정 컬럼만 지정을 하더라도 모든 테이블의 컬럼에 대한 DO_TM_TASK('ANALYZE_ROW_COUNT')가 호출된다.  
통계정보 수집시 대상이 되는 데이터 범위를 지정할 수 있다. default는 10%이다.  

### ANALYZE_STATISTICS_PARTITION()
지정된 테이블에서 파티션 범위에 대한 데이터 샘플 및 스토리지 정보를 수집하고 집계한다.  

### DO_TM_TASK('ANALYZE_ROW_COUNT');
최소한의 통계 정보와 프로젝션에 대한 row count를 수집한다.  

### ANALYZE_EXTERNAL_ROW_COUNT()
EXTERNAL TABLE의 정확한 ROW COUNT를 계산한다. 옵티마이저는 이 COUNT를 사용하여 EXTERNAL TABLE에 액세스하는 쿼리를 최적화 한다.  


```sql
dbadmin=> DROP TABLE IF EXISTS T;
dbadmin=> --버티카에서 실습용으로 생성 할 수 있는 VMart DB의 store.store_orders_fact 테이블로 테스트 진행
dbadmin=> CREATE TABLE PUBLIC.T AS SELECT * FROM store.store_orders_fact ;
CREATE TABLE
dbadmin=> 
dbadmin=> --파티션 선언
dbadmin=> ALTER TABLE public.T PARTITION BY date_ordered::DATE REORGANIZE;
NOTICE 4954:  The new partitioning scheme will produce 600 partitions
WARNING 9249:  Using PARTITION expression that may result in NULL values
HINT:  DML statements which produce NULL values for partition expressions will roll back
NOTICE 4785:  Started background repartition table task
ALTER TABLE
dbadmin=> 
dbadmin=> --통계정보 생성 확인
dbadmin=> SELECT STATISTICS_TYPE , STATISTICS_UPDATED_TIMESTAMP , PROJECTION_NAME, PROJECTION_COLUMN_NAME
dbadmin-> FROM PROJECTION_COLUMNS
dbadmin-> WHERE TABLE_NAME = 'T'
dbadmin-> ORDER BY COLUMN_POSITION;
STATISTICS_TYPE | STATISTICS_UPDATED_TIMESTAMP | PROJECTION_NAME | PROJECTION_COLUMN_NAME
-----------------+------------------------------+-----------------+------------------------
NONE            |                              | T_b1            | product_key
NONE            |                              | T_b0            | product_key
NONE            |                              | T_b1            | product_version
NONE            |                              | T_b0            | product_version
NONE            |                              | T_b0            | store_key
NONE            |                              | T_b1            | store_key
NONE            |                              | T_b0            | vendor_key
NONE            |                              | T_b1            | vendor_key
--중략
(38 rows)

dbadmin=> --실행계획 확인
dbadmin=> EXPLAIN SELECT COUNT(*) FROM T WHERE DATE_ORDERED = '2006-12-10';
    QUERY PLAN    
------------------------------
------------------------------
QUERY PLAN DESCRIPTION:
------------------------------

EXPLAIN SELECT COUNT(*) FROM T WHERE DATE_ORDERED = '2006-12-10';

Access Path:
+-GROUPBY NOTHING [Cost: 223, Rows: 1 (NO STATISTICS)] (PATH ID: 1)
|  Aggregates: count(*)
|  Execute on: All Nodes
| +---> STORAGE ACCESS for T [Cost: 222, Rows: 10K (NO STATISTICS)] (PATH ID: 2)
| |      Projection: public.T_b0
| |      Filter: (T.date_ordered = '2006-12-10'::date)
| |      Execute on: All Nodes
--중략

dbadmin=> --테이블 레벨의 통계 정보 수집
dbadmin=> SELECT ANALYZE_STATISTICS('PUBLIC.T');
ANALYZE_STATISTICS
--------------------
                  0
(1 row)

dbadmin=> --통계정보 생성 확인
dbadmin=> SELECT STATISTICS_TYPE , STATISTICS_UPDATED_TIMESTAMP , PROJECTION_NAME, PROJECTION_COLUMN_NAME
dbadmin-> FROM PROJECTION_COLUMNS
dbadmin-> WHERE TABLE_NAME = 'T'
dbadmin-> ORDER BY COLUMN_POSITION;
STATISTICS_TYPE | STATISTICS_UPDATED_TIMESTAMP  | PROJECTION_NAME | PROJECTION_COLUMN_NAME
-----------------+-------------------------------+-----------------+------------------------
FULL            | 2020-05-20 17:15:26.064861+09 | T_b1            | product_key
FULL            | 2020-05-20 17:15:26.064861+09 | T_b0            | product_key
FULL            | 2020-05-20 17:15:26.064861+09 | T_b1            | product_version
FULL            | 2020-05-20 17:15:26.064861+09 | T_b0            | product_version
FULL            | 2020-05-20 17:15:26.064861+09 | T_b0            | store_key
FULL            | 2020-05-20 17:15:26.064861+09 | T_b1            | store_key
FULL            | 2020-05-20 17:15:26.064861+09 | T_b0            | vendor_key
FULL            | 2020-05-20 17:15:26.064861+09 | T_b1            | vendor_key
--중략
(38 rows)

dbadmin=> --실행계획 확인
dbadmin=> EXPLAIN SELECT COUNT(*) FROM T WHERE DATE_ORDERED = '2006-12-10';
    QUERY PLAN    
------------------------------
------------------------------
QUERY PLAN DESCRIPTION:
------------------------------

EXPLAIN SELECT COUNT(*) FROM T WHERE DATE_ORDERED = '2006-12-10';

Access Path:
+-GROUPBY NOTHING [Cost: 11K, Rows: 1] (PATH ID: 1)
|  Aggregates: count(*)
|  Execute on: All Nodes
| +---> STORAGE ACCESS for T [Cost: 11K, Rows: 2K] (PATH ID: 2)
| |      Projection: public.T_b0
| |      Filter: (T.date_ordered = '2006-12-10'::date)
| |      Execute on: All Nodes


dbadmin=> --파티션 레벨의 통계 정보 수집
dbadmin=> SELECT ANALYZE_STATISTICS_PARTITION('PUBLIC.T', '2003-01-01', '2007-12-10');
ANALYZE_STATISTICS_PARTITION
------------------------------
                            0
(1 row)

dbadmin=> --실행계획 확인
dbadmin=> EXPLAIN SELECT COUNT(*) FROM T WHERE DATE_ORDERED = '2007-12-10';
    QUERY PLAN    
------------------------------
------------------------------
QUERY PLAN DESCRIPTION:
------------------------------

EXPLAIN SELECT COUNT(*) FROM T WHERE DATE_ORDERED = '2007-12-10';

Access Path:
+-GROUPBY NOTHING [Cost: 2, Rows: 1] (PATH ID: 1)
|  Aggregates: count(*)
|  Execute on: All Nodes
| +---> STORAGE ACCESS for T [Cost: 1, Rows: 2K(PARTITION-LEVEL STATISTICS)] (PATH ID: 2)
| |      Projection: public.T_b1
| |      Filter: (T.date_ordered = '2007-12-10'::date)
| |      Execute on: All Nodes

```
