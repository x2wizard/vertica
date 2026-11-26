---
title: Projection과 table 관계
description: projection과 table 관계에 대한 설명
date: 2025-09-20
lastUpdated: 2025-09-20
tags:
  - table
  - projection
  - projection과 table 관계
  - 프로젝션
  - OpenText Analytics Database(Vertica)
---

## projection과 table 관계
버티카에서 table은 논리적인 구조 정의, projection은 물리적인 구조 정의라고 했다. 이 의미는 실제 데이터는 projection에 저장되며, 쿼리에서는 논리적 구조인 table을 이용한다고 생각하면 된다.  
사용자는 어떤 projection을 사용할것인가에 대한 판단이 불필요하며, 옵티마이저에 의해 쿼리에 따라 최적에 projection을 선택하여 쿼리를 수행한다.  
기본적으로 table을 생성하면 projection은 생성되지 않으며, 테이블 생성 후 최초 데이터가 저장되는 시점에 모든 컬럼을 가지고 있는 projection인 super projection이 생성된다.  
모든 테이블에는 반드시 테이블의 모든 컬럼을 포함하고 있는 supper projection이 반드시 하나 이상 존재해야 한다.  

```sql
--table생성
dbadmin=> create table t(col1 int);
CREATE TABLE

--시스템 테이블인 tables에서 테이블 확인 
dbadmin=> select table_name from tables;
table_name
------------
t
(1 row)

--시스템 테이블인 projections에서 projection 확인
--아직 projectiond은 생성되지 않았음.
dbadmin=> select anchor_table_name, projection_name from projections;
anchor_table_name | projection_name
-------------------+-----------------
(0 rows)

--데이터 insert
dbadmin=> insert into t values(1);
OUTPUT
--------
      1
(1 row)

--시스템 테이블인 tables에서 테이블 확인 
dbadmin=> select table_name from tables;
table_name
------------
t
(1 row)

--시스템 테이블인 projections에서 projection 확인
--데이터가 insert되면서 projection명에 b0, b1로 끝나는 projection이 두개 생성되어 있음.
--projection이 두개 생성되는 이유는 k-safety로 인해 buddy projection이 생성된것임. b1으로 끝나는 projection이 buddy projection임.
dbadmin=> select anchor_table_name, projection_name from projections;
anchor_table_name | projection_name
-------------------+-----------------
t                 | t_b0
t                 | t_b1
(2 rows)

dbadmin=> select anchor_table_name, node_name, projection_name, projection_column_count, row_count, wos_row_count, ros_row_count, ros_count 
dbadmin=> from projection_storage order by 1,2,3;
anchor_table_name |     node_name      | projection_name | projection_column_count | row_count | wos_row_count | ros_row_count | ros_count
-------------------+--------------------+-----------------+-------------------------+-----------+---------------+---------------+-----------
t                 | v_test_db_node0001 | t_b0            |                       2 |         0 |             0 |             0 |         0
t                 | v_test_db_node0001 | t_b1            |                       2 |         0 |             0 |             0 |         0
t                 | v_test_db_node0002 | t_b0            |                       2 |         1 |             0 |             1 |         1
t                 | v_test_db_node0002 | t_b1            |                       2 |         0 |             0 |             0 |         0
t                 | v_test_db_node0003 | t_b0            |                       2 |         0 |             0 |             0 |         0
t                 | v_test_db_node0003 | t_b1            |                       2 |         1 |             0 |             1 |         1
(6 rows)

dbadmin=> select node_name, projection_name, storage_type, total_row_count, deleted_row_count 
dbadmin=> from storage_containers;
     node_name      | projection_name | storage_type | total_row_count | deleted_row_count
--------------------+-----------------+--------------+-----------------+-------------------
v_test_db_node0002 | t_b0            | ROS          |               1 |                 0
v_test_db_node0003 | t_b1            | ROS          |               1 |                 0
(2 rows)

dbadmin=> commit;
COMMIT
```
