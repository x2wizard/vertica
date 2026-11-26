---
title: purge 작업
description: 삭제된 데이터를 정리하기 위한 purge작업
date: 2025-09-20
lastUpdated: 2025-09-20
tags:
  - purge
  - Tuple mover
  - mergeout
  - make_ahm_now
  - OpenText Analytics Database(Vertica)
---

## purge
버티카에서 삭제 작업은 물리적 저장소에서 row를 제거 하지 않고 삭제한 row를 mark만 한다. 또한 버티카의 update는 내부적으로 delete + insert로 동작하므로 이 경우도 update 되기 전 row를 삭제됐다고 mark한다. 
이처럼 mark만 되어 있는 row들은 쿼리에서 읽었다가 삭제된 데이터 이므로 skip하고 처리하게 되므로 성능에도 영향을 미칠 수 있다. 또한 불필요한 물리적인 디스크 공간을 차지하고 있다.  
버티카에서는 이러한 문제를 해소하기 위해 Tuple mover의 mergeout task, purge() 함수 수행을 통해 해결하고 있다.  

purge의 대상은 epoch시점이 AHM보다 오래된 epoch시점들을 가지고 있는 delete vector에 저장된 데이터들을 대상으로 한다. 
purge작업에 대한 좀더 자세한 내용은 [Vertica Architecture의 데이터 삭제](/vertica/vertica_architecture/vertica_architecture_1080/#delete-vector%EC%99%80-epoch%EC%97%90%ED%8F%AC%ED%81%AC-%EB%AA%A8%EB%8D%B8-%EB%B0%8F-purge-%EC%9E%91%EC%97%85) 포스트를 참고 하기 바란다.  

### Tuple mover의 mergeout task를 통한 purge
mergeout은 ROS Container 병합과 delete vector를 정리하는 purge작업을 처리한다. 그러므로 Tuple mover의 mergeout task를 자동 또는 명시적인 호출로 purge를 수행 할 수 있다.  
Tuple mover의 mergeout은 기본적으로 10분 간격으로 백그라운드에서 수행되고 있으므로 간접적으로 purge가 수행되고 있다.  
아래 예제는 mergeout task를 명시적으로 호출해서 purge를 수행하는 예시이다.  

```sql
dbadmin=> insert into t values(1);commit;
dbadmin=> insert into t values(2);commit;
dbadmin=> delete from t where col1 = 1; commit;
dbadmin=> insert into t values(3);commit;
dbadmin=> insert into t values(4);commit;
dbadmin=> insert into t values(5);commit;
dbadmin=> insert into t values(6);commit;
dbadmin=> select current_epoch, ahm_epoch, last_good_epoch from system;
current_epoch | ahm_epoch | last_good_epoch
---------------+-----------+-----------------
           800 |       791 |             799
(1 row)

dbadmin=> select node_name, projection_name, storage_type, start_epoch, end_epoch
dbadmin=> from delete_vectors
dbadmin=> where projection_name ilike '%_b0'
dbadmin=> order by start_epoch;
     node_name      | projection_name | storage_type | start_epoch | end_epoch
--------------------+-----------------+--------------+-------------+-----------
v_test_db_node0002 | t_b0            | DVROS        |         795 |       795
(1 row)

dbadmin=> select make_ahm_now();
         make_ahm_now
------------------------------
AHM set (New AHM Epoch: 800)
(1 row)

dbadmin=> insert into t values(7);commit;
dbadmin=> insert into t values(8);commit;
dbadmin=> insert into t values(9);commit;
dbadmin=> insert into t values(10);commit;
dbadmin=> insert into t values(11);commit;
dbadmin=> delete from t where col1 = 10; commit;

dbadmin=> select current_epoch, ahm_epoch, last_good_epoch from system;
current_epoch | ahm_epoch | last_good_epoch
---------------+-----------+-----------------
           807 |       800 |             806
(1 row)

dbadmin=> select node_name, projection_name, storage_type, start_epoch, end_epoch
dbadmin=> from delete_vectors
dbadmin=> where projection_name ilike '%_b0'
dbadmin=> order by start_epoch;
     node_name      | projection_name | storage_type | start_epoch | end_epoch
--------------------+-----------------+--------------+-------------+-----------
v_test_db_node0002 | t_b0            | DVROS        |         795 |       795
v_test_db_node0003 | t_b0            | DVROS        |         806 |       806
(2 rows)

dbadmin=> --do_tm_task('mergeout') 호출해서 puerg수행
dbadmin=> select do_tm_task('mergeout');
     do_tm_task
-----------------------------------------------------
Task: mergeout
(Table: public.t) (Projection: public.t_b0)
(Table: public.t) (Projection: public.t_b1)
(1 row)

dbadmin=> select current_epoch, ahm_epoch, last_good_epoch from system;
current_epoch | ahm_epoch | last_good_epoch
---------------+-----------+-----------------
           807 |       800 |             806
(1 row)

dbadmin=> select node_name, projection_name, storage_type, start_epoch, end_epoch
dbadmin=> from delete_vectors
dbadmin=> where projection_name ilike '%_b0'
dbadmin=> order by start_epoch;
     node_name      | projection_name | storage_type | start_epoch | end_epoch
--------------------+-----------------+--------------+-------------+-----------
v_test_db_node0003 | t_b0            | DVROS        |         806 |       806
(1 row)

```

### purge()함수 호출을 통한 purge
make_ahm_now()를 호출해서 AHM epoch시점을 last good epoch (LGE)으로 앞당겨서 purge()함수를 호출한다.

```sql
dbadmin=> insert into t values(1);commit;
dbadmin=> insert into t values(2);commit;
dbadmin=> delete from t where col1 = 1; commit;
dbadmin=> insert into t values(3);commit;
dbadmin=> insert into t values(4);commit;
dbadmin=> insert into t values(5);commit;
dbadmin=> insert into t values(6);commit;
dbadmin=>
dbadmin=> select current_epoch, ahm_epoch, last_good_epoch from system;
current_epoch | ahm_epoch | last_good_epoch
---------------+-----------+-----------------
           815 |       806 |             814
(1 row)

dbadmin=> select node_name, projection_name, storage_type, start_epoch, end_epoch
dbadmin=> from delete_vectors
dbadmin=> where projection_name ilike '%_b0'
dbadmin=> order by start_epoch;
     node_name      | projection_name | storage_type | start_epoch | end_epoch
--------------------+-----------------+--------------+-------------+-----------
v_test_db_node0002 | t_b0            | DVROS        |         810 |       810
(1 row)

dbadmin=> select make_ahm_now();
         make_ahm_now
------------------------------
AHM set (New AHM Epoch: 815)
(1 row)

dbadmin=> insert into t values(7);commit;
dbadmin=> insert into t values(8);commit;
dbadmin=> insert into t values(9);commit;
dbadmin=> insert into t values(10);commit;
dbadmin=> insert into t values(11);commit;
dbadmin=> delete from t where col1 = 10; commit;
dbadmin=>
dbadmin=> select current_epoch, ahm_epoch, last_good_epoch from system;
current_epoch | ahm_epoch | last_good_epoch
---------------+-----------+-----------------
           822 |       815 |             821
(1 row)

dbadmin=> select node_name, projection_name, storage_type, start_epoch, end_epoch
dbadmin=> from delete_vectors
dbadmin=> where projection_name ilike '%_b0'
dbadmin=> order by start_epoch;
     node_name      | projection_name | storage_type | start_epoch | end_epoch
--------------------+-----------------+--------------+-------------+-----------
v_test_db_node0002 | t_b0            | DVROS        |         810 |       810
v_test_db_node0003 | t_b0            | DVROS        |         821 |       821
(2 rows)

dbadmin=> --purge()함수 호출을 통해 puerg수행
dbadmin=> select purge();
purge
---------------------------------------------------------------
Task: purge operation
(Table: public.t) (Projection: public.t_b0)
(Table: public.t) (Projection: public.t_b1)
(1 row)

dbadmin=> select current_epoch, ahm_epoch, last_good_epoch from system;
current_epoch | ahm_epoch | last_good_epoch
---------------+-----------+-----------------
           822 |       815 |             821
(1 row)

dbadmin=> select node_name, projection_name, storage_type, start_epoch, end_epoch
dbadmin=> from delete_vectors
dbadmin=> where projection_name ilike '%_b0'
dbadmin=> order by start_epoch;
     node_name      | projection_name | storage_type | start_epoch | end_epoch
--------------------+-----------------+--------------+-------------+-----------
v_test_db_node0003 | t_b0            | DVROS        |         821 |       821
(1 row)

```
