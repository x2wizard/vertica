---
title: markdown 표기 샘플
description: markdown 표기 샘플 입니다.
date: 2019-12-02
tags:
  - markdown
---

## 제목(Heading)

# #Heading1
## ##Heading2
### ###Heading3
#### ####Heading4
##### #####Heading5
###### ######Heading6


## 본문(paragraph)

그냥 텍스트 입력


## 인용(Blockquotes)
> ">"로 시작하세요.
>> ">>"로 시작하세요.
>>> ">>>"로 시작하세요.


## 목록(Blockquotes)
```
순서있는목록 - 순서있는 목록은 숫자와 점을 입력후 한 칸 공백
1. 리스트1
2. 리스트2
3. 리스트3
```
1. 리스트1
2. 리스트2
3. 리스트3

```
순서없는목록 - */+/_를 사용해서 하위를 표현하기 위해서는 공백2칸 입력후 사용
* 리스트1
  * 리스트2
    * 리스트3
```
* 리스트1
  * 리스트2
    * 리스트3


## 코드
    공백4칸 or TAB 1칸으로 시작하면 코드로 인식됨.
    들여쓰지 않은 행을 만날때까지 코드로 인식.
    function square(n) {
        return n * n;
    }

```java
```를 입력해서 시작하고 
//```java(시작시 언어를 표현하면 문법 하이라이트)
function square(n) {
    return n * n;
}
```를 입력해서 종료함.
```

```sql
--```sql(시작시 언어를 표현하면 문법 하이라이트)
select * from dual;
```


## 수평선
```
'*' or '-' 를 연속해서 입력
> ****
> 
> ----- 
```

> ****
> 
> ----- 


## 링크
* 자동연결

```
<URL 입력>
<https://google.com>
```
<https://google.com>


* 인라인 링크

```
[링크제목](주소)
[Google](https://google.com)  
[Google](https://google.com){:target="_blank"} 새창에서
```
[Google](https://google.com)  
[Google](https://google.com)  

## 강조
```
*이탤릭*한 텍스트
**볼드**한 텍스트
~~취소~~한 텍스트
```
*이탤릭*한 텍스트

**볼드**한 텍스트

~~취소~~한 텍스트


## 이미지 삽입
```
![대체 텍스트](/경로/example.jpg)
![대체 텍스트](링크)
![구글](https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png)
```
![구글](https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png)


## 표만들기
```
헤더 셀을 구분할 때 3개 이상의 -(hyphen/dash) 기호가 필요합니다.
헤더 셀을 구분하면서 :(Colons) 기호로 셀(열/칸) 안에 내용을 정렬할 수 있습니다.
가장 좌측과 가장 우측에 있는 |(vertical bar) 기호는 생략 가능합니다.
-----------------------------------------------------------------
| 값 | 의미 | 기본값 |
|---|:---:|---:|
| `static` | 유형(기준) 없음 / 배치 불가능 | `static` |
| `relative` | 요소 자신을 기준으로 배치 |  |
| `absolute` | 위치 상 부모(조상)요소를 기준으로 배치 |  |
| `fixed` | 브라우저 창을 기준으로 배치 |  |
```

값 | 의미 | 기본값
---|:---:|---:
`static` | 유형(기준) 없음 / 배치 불가능 | `static`
`relative` | 요소 **자신**을 기준으로 배치 |
`absolute` | 위치 상 **_부모_(조상)요소**를 기준으로 배치 |
`fixed` | **브라우저 창**을 기준으로 배치 |

왼쪽정렬 | 가운데정렬 | 오른쪽정렬
|:---|:---:|---:|
11|11|11



## 기타
```
MarkDown 에 사용되는 기호 표시
\문자를 앞에 사용하면 MarkDown 에 사용되는 기호 표시 가능
# Header1
\# Header1
```
# Header1
\# Header1

***************************

```
줄바꿈
줄마지막에 공백 2칸 or <br> 입력하면 줄바꿈으로 인식됨
11111  
22222
33333<br>44444
```
11111  
22222
33333<br>44444

***************************

```
`문자열에 블럭으로 감싸기`
```
`문자열에 블럭으로 감싸기`
