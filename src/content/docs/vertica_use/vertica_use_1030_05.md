---
title: projection관련 주요 system table
description: projection관련 주요 system table
date: 2026-11-26
tags:
  - projection
  - 프로젝션
  - system table
  - Vertica Analytics Database(Vertica)
---

## projection관련 system table

|스키마         |시스템 테이블             |설명    |
|:-----------:|:---------------------|:------------------------------------------------------|
|v_catalog    |projections           |Projection 정보                                         |
|v_catalog    |projection_columns    |Projection columns 정보                                 |
|v_monitor    |projection_storage    |각 projection의 Storage 정보. WOS, ROS container 사용량 등  |
|v_monitor    |storage_containers    |projection들의 row container 사용 현황등에 대한 정보          |
|v_monitor    |projection_refreshes  |projecttion의 refreshe 상태 정보                          |
|v_monitor    |projection_usage      |쿼리에서 사용한 Projection의 history 이력 정보                |
