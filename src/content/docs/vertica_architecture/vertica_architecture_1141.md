---
title: 버티카 Eon mode 그림으로 소개
description: 버티카의 Eon mode에 대해 이미지로 간략하게 소개
date: 2026-11-26
tags:
  - vertica
  - 버티카
  - Eon mode
  - 이온 모드
  - OpenText Analytics Database(Vertica)
---

## Eon mode 동작 방식
![Vertica Eon Mode 간략한 소개 1](../../../assets/posts/vertica_architecture/vertica_architecture_1141_01.png)

communal storage의 색깔별로 있는 영역은 shard를 의미하며, depot에는 각 compute node가 subscribe(구독)하는 shard들이 캐싱된다.  
shard는 데이터를 segment하는 영역으로 생각하면 되며, enterprise mode에서 projection의 segment와 유사하다고 생각하면된다.  

![Vertica Eon Mode 간략한 소개 2](../../../assets/posts/vertica_architecture/vertica_architecture_1141_02.png)


## 쉽고 빠른 확장성
![Vertica Eon Mode 간략한 소개 3](../../../assets/posts/vertica_architecture/vertica_architecture_1141_03.png)


## 서브 클러스터를 활용한 워크로드 분리
![Vertica Eon Mode 간략한 소개 4](../../../assets/posts/vertica_architecture/vertica_architecture_1141_04.png)


## 서브 클러스터를 활용한 워크로드 분리 활용 예
![Vertica Eon Mode 간략한 소개 5](../../../assets/posts/vertica_architecture/vertica_architecture_1141_05.png)


## Compute node 제거 후 “동면” 상태로 활용
![Vertica Eon Mode 간략한 소개 6](../../../assets/posts/vertica_architecture/vertica_architecture_1141_06.png)
