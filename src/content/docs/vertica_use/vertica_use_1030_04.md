---
title: 신규 projection 추가 생성 절차
description: 이미 사용중인 table에 projection을 추가 생성 및 삭제시 절차
date: 2026-11-26
tags:
  - projection
  - 프로젝션
  - projection 생성
  - projection 추가
  - projection 삭제
  - Vertica Analytics Database(Vertica)
---

## table에 projection을 추가로 생성하는 절차
이미 사용중인 table에 쿼리 튜링등의 목적으로 신규 projection을 추가 생성 하거나 이전에 생성된 super projection을 새로운 구조로 생성해야 하는 경우 아래와 같은 절차로 진행하면 된다. 이 과정은 서비스 중단 없이 온라인으로 가능하다.  
1. 추가 projection 생성
2. refresh()함수를 통한 projection 동기화
3. make_ahm_now()함수를 통한 epoch시점 최신화(기존 projection 삭제시)
4. drop projection 문을 통해 삭제하고자 하는 projection 삭제(기존 projection 삭제시)

아래 예제는 projection을 추가 생성하는 과정이다.  
projection 생성후 refresh()를 통해 projection 동기화가 되지 않으면 생성된 projection에 데이터가 존재하지 않기 때문에 쿼리에 사용되지 않는다. 그러므로 projection을 추가 생성한 후 반드시 refresh()를 통해 동기화를 수행해야 한다.  

```sql
dbadmin=> drop table if exists t cascade;
DROP TABLE

dbadmin=> create table t (col1 int, col2 int, col3 int) order by col1 segmented by hash(col1) all nodes;
CREATE TABLE
dbadmin=> insert /*+direct*/ into t values(1, 1, 1);
dbadmin=> insert /*+direct*/ into t values(2, 2, 2);
dbadmin=> insert /*+direct*/ into t values(3, 3, 3);
dbadmin=> commit;

--projection 상태 확인
dbadmin=> select projection_name, is_up_to_date, segment_expression from projections where anchor_table_name = 't';
projection_name | is_up_to_date | segment_expression
-----------------+---------------+--------------------
t_b1            | t             | hash(t.col1)
t_b0            | t             | hash(t.col1)
(2 rows)

--projection 추가
--WARNING 메시지를 통해 refresh를 수행하라고 경고
dbadmin=> create projection t_tune1 as select col2, col3 from t order by col2 segmented by hash(col2) all nodes;
WARNING 4468:  Projection <public.t_tune1_b0> is not available for query processing. Execute the select start_refresh() function to copy data into this projection.
          The projection must have a sufficient number of buddy projections and all nodes must be up before starting a refresh
WARNING 4468:  Projection <public.t_tune1_b1> is not available for query processing. Execute the select start_refresh() function to copy data into this projection.
          The projection must have a sufficient number of buddy projections and all nodes must be up before starting a refresh
CREATE PROJECTION

--projection 상태 확인
--is_up_to_date 컬럼으로 projection 동기화 여부 확인 가능
dbadmin=> select projection_name, is_up_to_date, segment_expression from projections where anchor_table_name = 't' order by 1;
projection_name | is_up_to_date | segment_expression
-----------------+---------------+--------------------
t_b0            | t             | hash(t.col1)
t_b1            | t             | hash(t.col1)
t_tune1_b0      | f             | hash(t.col2)
t_tune1_b1      | f             | hash(t.col2)
(4 rows)

--projection 상태 확인
--[UptoDate]항목을 통해 projection 동기화 여부 확인 가능
dbadmin=> select get_projections('t');
Current system K is 1.
# of Nodes: 3.
Table public.t has 4 projections.

Projection Name: [Segmented] [Seg Cols] [# of Buddies] [Buddy Projections] [Safe] [UptoDate] [Stats]
----------------------------------------------------------------------------------------------------
public.t_tune1_b1 [Segmented: Yes] [Seg Cols: "public.t.col2"] [K: 1] [public.t_tune1_b0] [Safe: Yes] [UptoDate: No] [Stats: No]
public.t_tune1_b0 [Segmented: Yes] [Seg Cols: "public.t.col2"] [K: 1] [public.t_tune1_b1] [Safe: Yes] [UptoDate: No] [Stats: No]
public.t_b1 [Segmented: Yes] [Seg Cols: "public.t.col1"] [K: 1] [public.t_b0] [Safe: Yes] [UptoDate: Yes] [Stats: No]
public.t_b0 [Segmented: Yes] [Seg Cols: "public.t.col1"] [K: 1] [public.t_b1] [Safe: Yes] [UptoDate: Yes] [Stats: No]
(1 row)

--쿼리 실행 계획을 통해 어떤 projection이 사용되는지 확인
--Projection: public.t_b0 라인을 통해 사용되는 projection 확인 가능
dbadmin=> explain select col2 from t order by col2;
------------------------------
QUERY PLAN DESCRIPTION:
------------------------------
explain select col2 from t order by col2;
Access Path:
+-SORT [Cost: 212, Rows: 10K (NO STATISTICS)] (PATH ID: 1)
|  Order: t.col2 ASC
|  Execute on: All Nodes
| +---> STORAGE ACCESS for t [Cost: 202, Rows: 10K (NO STATISTICS)] (PATH ID: 2)
| |      Projection: public.t_b0
| |      Materialize: t.col2
| |      Execute on: All Nodes

--projection 동기화
dbadmin=> select refresh('t');
Refresh completed with the following outcomes:
Projection Name: [Anchor Table] [Status] [Refresh Method] [Error Count] [Duration (sec)]
----------------------------------------------------------------------------------------
"public"."t_tune1_b1": [t] [refreshed] [scratch] [0] [0]
"public"."t_tune1_b0": [t] [refreshed] [scratch] [0] [0]

--projection 상태 확인
dbadmin=> select projection_name, is_up_to_date, segment_expression from projections where anchor_table_name = 't' order by 1;
projection_name | is_up_to_date | segment_expression
-----------------+---------------+--------------------
t_b0            | t             | hash(t.col1)
t_b1            | t             | hash(t.col1)
t_tune1_b0      | t             | hash(t.col2)
t_tune1_b1      | t             | hash(t.col2)
(4 rows)

--projection 상태 확인
dbadmin=> select get_projections('t');
Current system K is 1.
# of Nodes: 3.
Table public.t has 4 projections.

Projection Name: [Segmented] [Seg Cols] [# of Buddies] [Buddy Projections] [Safe] [UptoDate] [Stats]
----------------------------------------------------------------------------------------------------
public.t_tune1_b1 [Segmented: Yes] [Seg Cols: "public.t.col2"] [K: 1] [public.t_tune1_b0] [Safe: Yes] [UptoDate: Yes] [Stats: RowCounts]
public.t_tune1_b0 [Segmented: Yes] [Seg Cols: "public.t.col2"] [K: 1] [public.t_tune1_b1] [Safe: Yes] [UptoDate: Yes] [Stats: RowCounts]
public.t_b1 [Segmented: Yes] [Seg Cols: "public.t.col1"] [K: 1] [public.t_b0] [Safe: Yes] [UptoDate: Yes] [Stats: RowCounts]
public.t_b0 [Segmented: Yes] [Seg Cols: "public.t.col1"] [K: 1] [public.t_b1] [Safe: Yes] [UptoDate: Yes] [Stats: RowCounts]

--쿼리 실행 계획을 통해 어떤 projection이 사용되는지 확인
--Projection: public.t_tune1_b0 라인을 통해 사용되는 projection 확인 가능
dbadmin=> explain select col2 from t order by col2;
------------------------------
QUERY PLAN DESCRIPTION:
------------------------------
explain select col2 from t order by col2;

Access Path:
+-STORAGE ACCESS for t [Cost: 2, Rows: 3 (NO STATISTICS)] (PATH ID: 2)
|  Projection: public.t_tune1_b0
|  Materialize: t.col2
|  Execute on: All Nodes
```
