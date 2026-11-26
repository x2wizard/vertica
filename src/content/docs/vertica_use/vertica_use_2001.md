---
title: Text Search
description: 텍스트를 빠르게 검색하는 기능
date: 2026-11-26
tags:
  - text search
  - text index
  - Vertica Analytics Database(Vertica)
---

## Text Search
Text Search 기능은 CHAR, VARCHAR, LONG VARCHAR, VARBINARY, or LONG VARBINARY 필드의 내용을 빠르게 검색하여 특정 키워드를 찾을 수 있는 기능이다.  
특정 키워드를 빠르게 검색하기 위해 text index를 생성하면 키워드를 저장하는 token컬럼과 실제 키워드가 저장 되어진 source table과 연결하기 위한 pk가 저장되는 doc_id 컬럼이 존재하게 된다.  
source table 대한 text index을 한 번만 생성하면 source table에 추가, 변경, 삭제가 일어나더라도 text index와 source table이 자동으로 동기화 상태를 유지하게 된다.  
text index를 만들면 DML 작업에 약간의 성능 저하가 발생한다. 이것은 text index와 source table을 동기화하는 부하가 추가적으로 발생하기 때문이다. source table에 작업이 수행될 때마다 text index를 백그라운드에서 업데이터 하기 때문이다.  
text index에는 source table의 text필드의 모든 단어와 인덱스를 생성하는 동안 추가된 컬럼들이 포함되어 있다. text index는 source table과 내부적으로 연결되는 것을 제외하고는 버티카의 table과 동일하다.  

**text index table 생성 조건**  
+ source table에 PK 컬럼이 존재해야함.
+ source table에 검색한 컬럼이 존재해야함.
+ source table의 projection이 segment key를 PK로 지정되거나 unsegment로 된 projection이 존재해야함.
+ source table을 drop cascade로 삭제하면 text index table도 삭제됨.

### text index table 생성
+ source table의 PK를 저장하는 doc_id컬럼이 생성.
+ source table의 지정된 컬럼의 tokenizing한 단어들이 저장되는 token컬럼 생성.
+ source table이 partition table인 경우에만 자동으로 partition key를 저장하는 컬럼이 생성.  

주의> text index의 내용이나, 정의를 변경하면 결과가 source table과 일치하지 않으므로 변경하지 말고 새로 생성해야 한다.  

```sql
CREATE TEXT INDEX <text_index_table> ON <source_table> (<source_table_pk_colmun>, <source_table_text_colmun>);
```

### text index table 삭제
```sql
--text index 삭제
drop text index <text_index_table>;
--table 삭제로 text index 삭제
drop table <source_table> cascade;
```

### text index 검색
text index table에서 키워드로 token을 조회해서 doc_id를 찾고 doc_id로 source table의 PK를 검색해서 source table을 조회한다.
```sql
dbadmin=> drop table if exists t_log cascade;
DROP TABLE
dbadmin=> CREATE TABLE t_log (id INT PRIMARY KEY NOT NULL,text VARCHAR(1000));
CREATE TABLE

--STDIN으로 입력시 \.를 만날때 까지 스트림으로 입력받게 된다.
dbadmin=> COPY t_log FROM STDIN;
Enter data to be copied followed by a newline.
End with a backslash and a period on a line by itself.
>> 1|2014-05-10 00:00:05.700433 %ASA-6-302013: Built outbound TCP connection 9986454 for outside:101.123.123.111/443 (101.123.123.111/443)
>> \.

--index table 생성
dbadmin=> CREATE TEXT INDEX t_log_index ON t_log (id, text);
CREATE INDEX

--index table DDL확인
dbadmin=> select export_objects('', 't_log_index');
    export_objects                                    
------------------------------------------------------
CREATE TEXT INDEX public.t_log_index ON public.t_log ( id, "text") 
TOKENIZER v_txtindex.StringTokenizer(Integer, Varchar) 
STEMMER  v_txtindex.StemmerCaseInsensitive(v Long Varchar);

--index 확인
dbadmin=> select * from  t_log_index order by token;
            token            | doc_id
-----------------------------+--------
%asa-6-302013:              |      1
(101.123.123.111/443)       |      1
00:00:05.700433             |      1
2014-05-10                  |      1
9986454                     |      1
built                       |      1
connect                     |      1
for                         |      1
outbound                    |      1
outside:101.123.123.111/443 |      1
tcp                         |      1
(11 rows)

dbadmin=> select * from  t_log_index where token = 'tcp';
token | doc_id
-------+--------
tcp   |      1
(1 row)

--text index를 활용한 source table 검색
dbadmin=> select * from t_log where id in (select doc_id from  t_log_index where token = 'tcp');
id |    text
----+--------------------------------------------------------------------------------------------------------------------------------------
  1 | 2014-05-10 00:00:05.700433 %ASA-6-302013: Built outbound TCP connection 9986454 for outside:101.123.123.111/443 (101.123.123.111/443)
(1 row)
```

## Stemmers and Tokenizers

### Stemmers
형태소(morpheme)는 언어학에서 일정한 의미가 있는 가장 작은 말의 단위를 뜻한다. 보통 자연어 처리에서는 토큰으로 형태소를 이용한다.  
형태소 분석이란 단어로부터 어근, 접두사, 접미사, 품사 등 다양한 언어적 속성을 파악하고 이를 이용하여 형태소를 찾아내거나 처리하는 작업이다. 이러한 형태소 분석의 예로 stemming(어간 추출)을 버티카에서 사용한다. stemming(어간 추출)은 변화된 단어의 접미사나 어미를 제거하여 같은 의미를 가지는 형태소의 기본형을 찾는 방법이다. 버티카는 stemmer로 Porter stemming 알고리즘을 사용한다.  
> 예>단어들을 steeming한 결과  
> [단어]         fly, flies, flying, flew, flown  
> [steeming결과] fly, fli, fly, flew, flown  

버티카 제공 stemmer는 아래와 같다.  

|stemmer                                            |설명      |
|:-------------------------------------------------:|:-------|
|v_txtindex.Stemmer(long varchar)                   |대소문자 구분 안함. 소문자 단어 출력. <br/>StemmerCaseInsensitive의 별칭|
|v_txtindex.StemmerCaseSensitive(long varchar)      |대소문자 구분|
|v_txtindex.StemmerCaseInsensitive(long varchar)    |대소문자 구분 안함. 소문자 단어 출력. <br/>text index생성시 stemmer 미지정시 default stemmer로 적용됨.|
|v_txtindex.caseInsensitiveNoStemming(long varchar) |대소문자 구분 안함. 소문자 단어 출력. <br/>Porter stemming 알고리즘 사용하지 않음.|

```sql
dbadmin=> drop table if exists t_log cascade;
DROP TABLE
dbadmin=> CREATE TABLE t_log (id INT PRIMARY KEY NOT NULL,text VARCHAR(1000));
CREATE TABLE

dbadmin=> COPY t_log FROM STDIN;
Enter data to be copied followed by a newline.
End with a backslash and a period on a line by itself.
>> 1|2014-05-10 00:00:05.700433 %ASA-6-302013: Built outbound TCP connection 9986454 for outside:101.123.123.111/443 (101.123.123.111/443)
>> \.

dbadmin=> CREATE TEXT INDEX t_log_index ON t_log (id, text)
dbadmin=> TOKENIZER v_txtindex.StringTokenizer(Integer, Varchar) 
dbadmin=> STEMMER  v_txtindex.StemmerCaseInsensitive(v Long Varchar);
CREATE INDEX

--대소문자 미구분
dbadmin=> select * from  t_log_index where token = v_txtindex.StemmerCaseInsensitive('TCP'); 
token | doc_id
-------+--------
tcp   |      1
(1 row)

--대소문자 구분
dbadmin=> select * from  t_log_index where token = v_txtindex.StemmerCasesensitive('TCP'); 
token | doc_id
-------+--------
(0 rows)
```

### Tokenizers
자연어 문서를 분석하기 위해서는 우선 긴 문자열을 분석을 위한 작은 단위로 나누어야 한다. 이 문자열 단위를 토큰(token)이라고 하고 이렇게 문자열을 토큰으로 나누는 작업을 토큰 생성(tokenizing)이라고 한다. 영문의 경우에는 문장, 단어 등을 토큰으로 사용하거나 정규 표현식을 쓸 수 있다.  
문자열을 토큰으로 분리하는 함수를 토큰 생성 함수(tokenizer)라고 한다. 토큰 생성 함수는 문자열을 입력받아 토큰 문자열의 리스트를 출력한다.  
  
버티카의 tokenizer는 다음을 수행합니다.  
+ 문자 스트림을 수신
+ 스트림을 일반적으로 개별 단어에 해당하는 개별 토큰으로 분리
+ 토큰 스트림 반환
  
버티카의 미리 구성된 tokenizer는 아래와 같다.  

|tokenizer                                                |설명                                  |
|:-------------------------------------------------------:|:-------------------------------------|
|public.FlexTokenizer(LONG VARBINARY)                     |flex table의 값을 공백으로 나눈다.     |
|v_txtindex.StringTokenizer(LONG VARCHAR)                 |공백을 분할하여 문자열을 단어로 분할한다.|
|v_txtindex.StringTokenizerDelim(column_name,'delimiter') |column_name의 문자열을 지정된 delimiter로 분할하여 단어로 분할한다.|
|v_txtindex.AdvancedLogTokenizer                          |모든 토큰라이저 매개 변수에 대한 기본 매개 변수로 사용한다.|
|v_txtindex.BasicLogTokenizer                             |빈 목록으로 설정된 minor separator를 제외한 모든 토큰라이저 매개변수의 기본값을 사용한다.|
|v_txtindex.WhitespaceLogTokenizer                        |major separator를 제외한 토큰라이저 파라미터의 기본값으로 사용한다.  <br/>E' \t\n\f\r', minor separator, 빈 목록을 사용한다.|

**Advanced Log Tokenizer Parameters**(v_txtindex.AdvancedLogTokenizer)  

|Parameter Name            |Parameter Value|
|:------------------------:|:-----------------------------|
|stopwordscaseinsensitive  |''                            |
|minorseparators           |E'/:=@.-$#%\\_'               |
|majorseparators           |E' []<>(){}\|!;,''"*&?+\r\n\t' |
|minLength                 |'2'                           |
|maxLength                 |'128'                         |
|used                      |'True'                        |

**Basic Log Tokenizer Parameters**(v_txtindex.BasicLogTokenizer)  

|Parameter Name            |Parameter Value|
|:------------------------:|:-----------------------------|
|stopwordscaseinsensitive  |''                            |
|minorseparators           |''                            |
|majorseparators           |E' []<>(){}\|!;,''"*&?+\r\n\t' |
|minLength                 |'2'                           |
|maxLength                 |'128'                         |
|used    '                 |True'                         |


**Whitespace Log Tokenizer Parameters**(v_txtindex.WhitespaceLogTokenizer)  

|Parameter Name            |Parameter Value|
|:------------------------:|:-----------------------------|
|stopwordscaseinsensitive  |''                            |
|minorseparators           |''                            |
|majorseparators           |E' \t\n\f\r'                  |
|minLength                 |'2'                           |
|maxLength                 |'128'                         |
|used                      |'True'                        |

```sql
dbadmin=> drop table if exists t_log cascade;
DROP TABLE
dbadmin=> CREATE TABLE t_log (id INT PRIMARY KEY NOT NULL,text VARCHAR(1000));
CREATE TABLE

dbadmin=> COPY t_log FROM STDIN;
Enter data to be copied followed by a newline.
End with a backslash and a period on a line by itself.
>> 1|2014-05-10 00:00:05.700433 %ASA-6-302013: Built outbound TCP connection 9986454 for outside:101.123.123.111/443 (101.123.123.111/443)
>> \.

--Advanced Log Tokenizer
dbadmin=> CREATE TEXT INDEX t_AdvancedLogTokenizer ON t_log (id, text)
dbadmin-> TOKENIZER v_txtindex.AdvancedLogTokenizer(LONG VARCHAR)
dbadmin-> STEMMER NONE;
CREATE INDEX

dbadmin=> SELECT * FROM t_AdvancedLogTokenizer;
            token            | doc_id
-----------------------------+--------
%ASA-6-302013:              |      1
00                          |      1
00:00:05.700433             |      1
05                          |      1
10                          |      1
101                         |      1
101.123.123.111/443         |      1
111                         |      1
123                         |      1
2014                        |      1
2014-05-10                  |      1
302013                      |      1
443                         |      1
700433                      |      1
9986454                     |      1
ASA                         |      1
Built                       |      1
TCP                         |      1
connection                  |      1
for                         |      1
outbound                    |      1
outside                     |      1
outside:101.123.123.111/443 |      1
(23 rows)

--Basic Log Tokenizer
dbadmin=> CREATE TEXT INDEX t_BasicLogTokenizer ON t_log (id, text)
dbadmin-> TOKENIZER v_txtindex.BasicLogTokenizer(LONG VARCHAR)
dbadmin-> STEMMER NONE;
CREATE INDEX

dbadmin=> SELECT * FROM t_BasicLogTokenizer;
            token            | doc_id
-----------------------------+--------
%ASA-6-302013:              |      1
00:00:05.700433             |      1
101.123.123.111/443         |      1
2014-05-10                  |      1
9986454                     |      1
Built                       |      1
TCP                         |      1
connection                  |      1
for                         |      1
outbound                    |      1
outside:101.123.123.111/443 |      1
(11 rows)

--Whitespace Log Tokenizer
dbadmin=> CREATE TEXT INDEX t_WhitespaceLogTokenizer ON t_log (id, text)
dbadmin-> TOKENIZER v_txtindex.WhitespaceLogTokenizer(LONG VARCHAR) STEMMER NONE;
CREATE INDEX

dbadmin=> SELECT * FROM t_WhitespaceLogTokenizer;
            token            | doc_id
-----------------------------+--------
%ASA-6-302013:              |      1
(101.123.123.111/443)       |      1
00:00:05.700433             |      1
2014-05-10                  |      1
9986454                     |      1
Built                       |      1
TCP                         |      1
connection                  |      1
for                         |      1
outbound                    |      1
outside:101.123.123.111/443 |      1
(11 rows)
```

## ICU Tokenizer
버티카는 여러 언어를 지원하기 위해 v_txtindex.ICUTokenizer tokenizer를 제공한다. local 파라미터에 설정한 언어의 규칙을 기반으로 토큰화한다. v_txtindex.ICUTokenizer 사용은 아래 절차로 진행하면 된다.  
  
1. UDTF를 사용해서 tokenizer생성  
2. 생성한 tokenizer를 vs_procedures table에서 조회해서 proc_oid 값 확인  
3. locale 파라미터를 ISO-639-1의 언어 코드와 ISO-3166-1의 국가 코드를 이용해서 설정한다.(예>한국어_한국 ko_KR)  
4. tokenizer를 잠근다.  
5. text index 생성시 TOKENIZER 지정을 위에서 생성한 tokenizer로 지정해서 생성한다.  
6. 생성된 text index를 확인한다.  

아래 예제는 한글에 대한 tokenizer를 생성하는 예시이다.  
```sql
--step 1
dbadmin=> CREATE OR REPLACE TRANSFORM FUNCTION v_txtindex.ICUKoreaTokenizer
dbadmin-> AS LANGUAGE 'C++' NAME 'ICUTokenizerFactory' LIBRARY v_txtindex.logSearchLib NOT FENCED;
CREATE TRANSFORM FUNCTION

--step 2
dbadmin=> SELECT proc_oid from vs_procedures where procedure_name = 'ICUKoreaTokenizer';
     proc_oid
-------------------
45035996273857164
(1 row)

--step 3
dbadmin=> SELECT v_txtindex.SET_TOKENIZER_PARAMETER('locale','ko_KR' using parameters proc_oid='45035996273857164');
SET_TOKENIZER_PARAMETER
-------------------------
t
(1 row)

--step 4
dbadmin=> SELECT v_txtindex.SET_TOKENIZER_PARAMETER('used','true' using parameters proc_oid='45035996273857164');
SET_TOKENIZER_PARAMETER
-------------------------
t
(1 row)

--text search를 위한 원본 테이블
dbadmin=> drop table if exists t cascade;
DROP TABLE
dbadmin=> CREATE TABLE t (id INT PRIMARY KEY NOT NULL,text VARCHAR(250));
CREATE TABLE
dbadmin=> COPY t FROM STDIN;
Enter data to be copied followed by a newline.
End with a backslash and a period on a line by itself.
>> 1|버티카는 대용량 데이터 분석을 위한 Pure-MPP 구성의 ANSI SQL99+를 지원하는 컬럼기반 RDBMS 이다.
>> \.

--step 5
dbadmin=> CREATE TEXT INDEX t_index_ICUTokenizer ON t (id, text) TOKENIZER v_txtindex.ICUKoreaTokenizer(long varchar) stemmer none;
CREATE INDEX

--step 6
dbadmin=> SELECT * FROM t_index_ICUTokenizer ORDER BY doc_id;
  token   | doc_id
----------+--------
컬럼기반 |      1
지원하는 |      1
이다     |      1
위한     |      1
분석을   |      1
버티카는 |      1
를       |      1
데이터   |      1
대용량   |      1
구성의   |      1
SQL99    |      1
RDBMS    |      1
Pure     |      1
MPP      |      1
ANSI     |      1
(15 rows)
```

**Tokenizer의 cofiguration parameter 설정**  
```sql
SELECT v_txtindex.SET_TOKENIZER_PARAMETER (parameter_name, parameter_value USING PARAMETERS proc_oid='proc_oid')
```

**Tokenizer의 cofiguration parameter 확인**  
```sql
--Tokenizer의 개별 cofiguration parameter 확인  
SELECT v_txtindex.GET_TOKENIZER_PARAMETER(parameter_name USING PARAMETERS proc_oid='proc_oid');
--Tokenizer의 모든 cofiguration parameter 확인  
SELECT v_txtindex.READ_CONFIG_FILE(USING PARAMETERS proc_oid='proc_oid') OVER ()
```

**Tokenizer의 cofiguration parameter 삭제**  
```sql
SELECT v_txtindex.DELETE_TOKENIZER_CONFIG_FILE (USING PARAMETERS proc_oid='proc_oid', confirm={true | false });
```

## 한글 검색시
한글인 경우 조사, 접두사, 접미사등에 대한 stemming이 잘 안되므로 검색시에 =이 아닌 like또는 ilike로 키워드를 검색해서 사용하면 좀 더 정확한 검색이 이루어 질 수 있다.  

```sql
select <search_context> 
from <source_table> 
where <source_table_pk_cloumn> in (
    select doc_id from <index_table> where token ilike '%<search_keyword>%'
);
```
