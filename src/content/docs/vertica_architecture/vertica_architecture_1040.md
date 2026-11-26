---
title: 데이터 적재
description: Vertica 데이터 적재
date: 2026-11-26
tags:
  - vertica
  - 버티카
  - ROS
  - tuple mover
  - TM
  - mergeout
  - Vertica Analytics Database(Vertica)
---

## Vertica Storage
버티카는 일반적인 DW 업무의 쿼리 수행과 함께 대량에 데이터 적재 및 쿼리 수행을 지원하기 위해 ROS라는 스토리지 모델을 가지고 있다.  

**ROS(Read-Optimized Store)**  
ROS는 디스크에 상주하는 데이터 저장소다. 대량에 데이터를 ROS에 직접 적재한다.
  
![Vertica ROS구조](../../../assets/posts/vertica_architecture/vertica_architecture_1040_01.png)

버티카 클러스터의 각 노드별로 ROS가 존재하며, 시스템 테이블 중 projection_storage, storage_containers 에서 projection의 데이터가 현재 어느 node의 ROS로 저장되어 있는지 알 수 있다.  


## Bulk Load

|데이터 적재 방식    | 설명 |
|:--------------:|:-----|
|Bulk load       |초기 데이터 적재 또는 대용량 로드의 경우 데이터를 직접 ROS에 저장 하는 게 좋습니다.<br>직접 ROS에 로드하고자 하는 경우 /*+DIRECT*/힌트를 사용하시면 됩니다.|
  
![Vertica bulk load](../../../assets/posts/vertica_architecture/vertica_architecture_1040_02.png)
  
버티카는 별도에 bulk load를 위한 tool 필요 없이 COPY라는 sql문을 사용하면 된다.  
COPY문은 insert문 처럼 레코드 단위로 데이터를 저장하지 않고 대량의 데이터를 한번에 적재하며, 데이터를 병렬로 적재 할 수 있다.  


## TUPLE MOVER
Tuple Mover(TM)은 버티카의 중요한 컴포넌트중 하나이다.  
Tuple Mover의 주요한 역할은 소형 ROS container 들을 합쳐서 큰 ROS container로 결합 하는 mergeout, 삭제된 데이터를 purge하는 기능등을 수행한다.  
Tuple Mover는 백그라운드에서 자동으로 실행되며, configuration parameter에서 지정한 시간 간격으로 작업이 수행된다. default로 설정된 MergeOutInterval은 600sec 이다.  
수동으로 실행해야 하는 경우는 DO_TM_TASK()함수를 사용하면 된다.  

  
### MERGEOUT Task
많은 ros container에서 쿼리를 처리하면 쿼리가 느릴 수 있기 때문에 tuple mover의 mergeout task를 통해 여러 container를 더 적은 수의 container로 병합한다. 
이렇게 하므로써 쿼리가 더 효율적으로 실행 될 수 있다. 수행 간격은 default 10분이다.  
  
처음에는 ROS에 여러 개의 데이터가 로드되어 여러 개의 container가 생성된다.  
![Vertica tuple mover mergeout_1](../../../assets/posts/vertica_architecture/vertica_architecture_1040_07.png)
  
각 container의 데이터를 병합해서 temp space로 이동시킨다.  
![Vertica tuple mover mergeout_2](../../../assets/posts/vertica_architecture/vertica_architecture_1040_08.png)
  
병합된 temp space에 있는 데이터를 새로운 ROS container에 구성한다.  
![Vertica tuple mover mergeout_3](../../../assets/posts/vertica_architecture/vertica_architecture_1040_09.png)
  
temp space를 비운다.  
![Vertica tuple mover mergeout_4](../../../assets/posts/vertica_architecture/vertica_architecture_1040_10.png)


## 데이터 무결성 검사
버티카는 DW업무 특성상 정제된 데이터가 들어온다고 가정하고 적재를 수행하여, 적재 속도를 빠르게 가져가도록 기본적으로 설정되어 있다.  
그러므로 데이터 무결성 검사가 필요한 경우 아래와 같이 primary, unique key에 대한 무결성 검사를 수행하도록 변경해 주어야 한다.  
  
```sql

ALTER DATABASE <dbname> SET EnableNewPrimaryKeysByDefault = 1;
ALTER DATABASE <dbname> SET EnableNewUniqueKeysByDefault = 1;

select parameter_name, default_value, current_value, description 
from configuration_parameters 
where parameter_name in ('EnableNewPrimaryKeysByDefault', 'EnableNewUniqueKeysByDefault');

parameter_name|default_value|current_value|description
--------------------------------------------------------------------------------------------------------------
EnableNewUniqueKeysByDefault|0|1|Determines whether new unique key constraints will be enabled by default
EnableNewPrimaryKeysByDefault|0|1|Determines whether new primary key constraints will be enabled by default


```
