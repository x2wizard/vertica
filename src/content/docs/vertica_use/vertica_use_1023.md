---
title: 버티카 접속 - vsql
description: vsql을 통한 버티카 접속 및 메타 명령어에 대한 설명
date: 2026-11-26
tags:
  - vertica vsql
  - 버티카 vsql
  - vsql
  - vsql 매타명령어
  - vsql meta-command
  - Vertica Analytics Database(Vertica)
---

## vsql를 통한 vertica 접속
버티카에서 제공하는 vsql은 text기반의 대화식 프론트 엔드 유틸리티로 SQL 문을 입력하고 결과를 볼 수 있습니다. 또한 스크립트 작성 및 다양한 작업 자동화를 용이하게하는 여러 가지 메타 명령 및 다양한 쉘 유사 기능을 제공합니다.  

## vsql로 버티카 데이터베이스 연결
```shell
#vsql –h <hostname> -U <username> -w <password>
vsql –h 192.168.40.55 -U dbadmin -w password
```
**[옵션]**  
-h : 클라이언트에서 DB서버에 연결할 때 node의 IP또는 host명 지정  
-U : 접속할 유저명 지정 (default는 dbadmin)  
-w : 유저의 DB 패스워드  
-C : connection load balancing을 설정했을 때 사용  
-B : connection load balancing을 사용할 때 –h 옵션으로 지정한 서버에 연결이 안될 때 연결할 대체 노드 지정  

vsql을 사용해서 쿼리는 수행하는 방법은 두가지 방법이 있다.  

**interactive mode**  
```sql
[dbadmin@vnode1 ~]$ vsql -U dbadmin -wpassword
Welcome to vsql, the Vertica Analytic Database interactive terminal.

Type:  \h or \? for help with vsql commands
       \g or terminate with semicolon to execute query
       \q to quit

dbadmin=> select count(*) from t;
count
-------
     5
(1 row)

dbadmin=> \q
[dbadmin@vnode1 ~]$
```

**command line mode**  
```shell
[dbadmin@vnode1 ~]$ vsql -U dbadmin -wpassword -c"select count(*) from t;"
count
-------
     5
(1 row)

[dbadmin@vnode1 ~]$
```


## vsql 메타 명령어
vsql 접속 후 세션 내에서 백슬래시(\)후 메타 명령어를 사용 하면 된다.  
아래 표는 주요 메타 명령들이다.  

|메타 명령                 | 설명          |
|:-----------------------:|:--------------|
|?                        | 도움말          |
|q                        | vsql 종료       |
|d                        | table describe  |
|dt                       | table list      |
|a                        | 출력 포맷 공백 제거 (toggle)|
|t                        |컬럼 헤더와 처리 건수 제거 (toggle)|
|timing                   |처리 시간 출력 (toggle)              |
|x                        |extended 포맷으로 출력 (toggle)<br/> 컬럼명 \| 값으로 출력된다. |
|f [문자]                 |필드 구분자 설정 (default는 \|)    |
|i [file path]            |외부 SQL 파일 수행|
|o [file path]            |수행 결과를 파일로 저장|
|!                        |리눅스 쉘 커맨드 사용|
|cd [디렉토리]             |작업디렉토리 전환|
|echo [문자열]             |문자열 출력|
|set [변수NAME 변수VALUE]  | 변수값 설정 |
|unset [변수name]          |변수 제거|

```sql
###########################
#\d meta-command
###########################
dbadmin=> \d t
                                List of Fields by Tables
Schema | Table | Column | Type | Size | Default | Not Null | Primary Key | Foreign Key
--------+-------+--------+------+------+---------+----------+-------------+-------------
public | t     | col1   | int  |    8 |         | f        | f           |
public | t     | col2   | int  |    8 |         | f        | f           |
public | t     | col3   | int  |    8 |         | f        | f           |
(3 rows)

###########################
#\dt meta-command
###########################
dbadmin=> \dt t
              List of tables
Schema | Name | Kind  |  Owner  | Comment
--------+------+-------+---------+---------
public | t    | table | dbadmin |
(1 row)

dbadmin=> select * from t;
col1 | col2 | col3
------+------+------
    5 |      |
    4 |      |
    1 |    1 |    1
    2 |    2 |    2
    3 |    3 |    3
(5 rows)

###########################
#\a meta-command
###########################
dbadmin=> \a
Output format is unaligned.
dbadmin=> select * from t;
col1|col2|col3
5||
4||
1|1|1
2|2|2
3|3|3
(5 rows)
dbadmin=> \a
Output format is aligned.

###########################
#\t meta-command
###########################
dbadmin=> \t
Showing only tuples.
dbadmin=> select * from t;
    5 |      |
    1 |    1 |    1
    2 |    2 |    2
    3 |    3 |    3
    4 |      |

dbadmin=> \t
Tuples only is off.

###########################
#\timing meta-command
###########################
dbadmin=> \timing
Timing is on.
dbadmin=> select * from t;
col1 | col2 | col3
------+------+------
    4 |      |
    5 |      |
    1 |    1 |    1
    2 |    2 |    2
    3 |    3 |    3
(5 rows)

Time: First fetch (5 rows): 34.260 ms. All rows formatted: 34.301 ms
dbadmin=> \timing
Timing is off.

###########################
#\x meta-command
###########################
dbadmin=> \x
Expanded display is on.
dbadmin=> select * from t;
-[ RECORD 1 ]
col1 | 5
col2 |
col3 |
-[ RECORD 2 ]
col1 | 4
col2 |
col3 |
-[ RECORD 3 ]
col1 | 1
col2 | 1
col3 | 1
-[ RECORD 4 ]
col1 | 2
col2 | 2
col3 | 2
-[ RECORD 5 ]
col1 | 3
col2 | 3
col3 | 3

dbadmin=> \x
Expanded display is off.

###########################
#\f meta-command
###########################
dbadmin=> \a
Output format is unaligned.
dbadmin=> \f ^
Field separator is "^".
dbadmin=> select * from t;
col1^col2^col3
5^^
1^1^1
2^2^2
3^3^3
4^^
(5 rows)

###########################
#\! meta-command
###########################
dbadmin=> \! ls
dbadmin=> \o t.txt
dbadmin=> select * from t;
dbadmin=> \! ls
t.txt
dbadmin=> \! cat t.txt
col1 | col2 | col3
------+------+------
    5 |      |
    1 |    1 |    1
    2 |    2 |    2
    3 |    3 |    3
    4 |      |
(5 rows)

dbadmin=> \o
dbadmin=> select * from t;
col1 | col2 | col3
------+------+------
    5 |      |
    1 |    1 |    1
    2 |    2 |    2
    3 |    3 |    3
    4 |      |
(5 rows)

###########################
#\cd meta-command
###########################
dbadmin=> \! pwd
/home/dbadmin
dbadmin=> \cd /tmp
dbadmin=> \! pwd
/tmp

###########################
#\echo meta-command
###########################
dbadmin=> \echo test echo
test echo

###########################
#\set meta-command
###########################
dbadmin=> \set p1 100
dbadmin=> select :p1;
?column?
----------
      100
(1 row)

dbadmin=> select 200 + :p1;
?column?
----------
      300
(1 row)

###########################
#\unset meta-command
###########################
dbadmin=> \unset p1
dbadmin=> select 200 + :p1;
ERROR 4856:  Syntax error at or near ":" at character 14
LINE 1: select 200 + :p1;
                     ^

dbadmin=> \q
[dbadmin@vnode1 ~]$
```

## vsql command line options과 메타 명령 도움말

### vsql command line options
vsql에 대한 다양한 옵션은 vsql --help를 수행하면 아래와 같이 확인 할 수 있다.  
```shell
[dbadmin@vnode1 ~]$ vsql --help
This is vsql, the Vertica Analytic Database interactive terminal.

Usage:
  vsql [OPTIONS]... [DBNAME [USERNAME]]

General options:
  -d DBNAME       specify database name to connect to (default: "dbadmin")
  -c COMMAND      run only single command (SQL or internal) and exit
  -f FILENAME     execute commands from file, then exit
  -l              list available databases, then exit
  -v NAME=VALUE   set vsql variable NAME to VALUE
  -X              do not read startup file (~/.vsqlrc)
  --help          show this help, then exit
  --version       output version information, then exit

Input and output options:
  -a              echo all input from script
  -e              echo commands sent to server
  -E              display queries that internal commands generate
  -q              run quietly (no messages, only query output)
  -o FILENAME     send query results to file (or |pipe)
  -n              disable enhanced command line editing (readline)
  -s              single-step mode (confirm each query)
  -S              single-line mode (end of line terminates SQL command)

Output format options:
  -A              unaligned table output mode (-P format=unaligned)
  -b              beep on command completion
  -H              HTML table output mode (-P format=html)
  -t              print rows only (-P tuples_only)
  -i              print \timing output
  -T TEXT         set HTML table tag attributes (width, border) (-P tableattr=)
  -x              turn on expanded table output (-P expanded)
  -Q              turn on trailing record separator (-P trailingrecordsep)
  -P VAR[=ARG]    set printing option VAR to ARG (see \pset command)
  -F STRING       set field separator for unaligned output (default: "|") (-P fieldsep=)
  -R STRING       set record separator (default: newline) (-P recordsep=)

Connection options:
  -4              prefer IPv4 addresses when resolving hostnames
  -6              prefer IPv6 addresses when resolving hostnames
  -B SERVER:PORT  set connection backup server/port (default: not set)
  -C              enable connection load balancing (default: not enabled)
  -h HOSTNAME     database server host or socket directory (default: "local socket")
  -k KRB SERVICE  kerberos service name (default: "vertica")
  -K KRB HOST     kerberos host name
  -m SSLMODE      SSL mode (verify-full, verify-ca, require, prefer, allow or disable; default: prefer)
  -p PORT         database server port (default: "5433")
  -U NAME         database user name (default: "dbadmin")
  -W              prompt for password (should happen automatically)
  -w PASSWORD     database user's password

For more information, type "\?" (for vsql commands)
from within vsql, or consult the vsql section in
the Vertica Analytic Database documentation.
```
자세하 내용은 [매뉴얼](https://www.vertica.com/docs/9.3.x/HTML/Content/Authoring/ConnectingToVertica/vsql/ConnectingFromTheCommandLine.htm?tocpath=Connecting%20to%20Vertica%7CUsing%20vsql%7CConnecting%20from%20the%20Command%20Line%7C_____0)을 참고 하기 바란다.  

### 메타 명령 도움말
vsql 접속 후 \h or \? 메타 명령을 수행하면 다양한 메타 명령을 확인 할 수 있다.  
```sql
dbadmin=> \h
See https://www.vertica.com/documentation/vertica/9.3.x for information on available commands.

General
  \c[onnect] [DBNAME|- [USER]]
                 connect to new database (currently "dbadmin")
  \cd [DIR]      change the current working directory
  \q             quit vsql
  \set [NAME [VALUE]]
                 set internal variable, or list all if no parameters
  \timing [on|off]
                 toggle timing of commands, or explicitly turn it on or off (currently off)
  \unset NAME    unset (delete) internal variable
  \! [COMMAND]   execute command in shell or start interactive shell
  \password [USER]
                 change user's password

Query Buffer
  \e [FILE]      edit the query buffer (or file) with external editor
  \g             send query buffer to server
  \g FILE        send query buffer to server and results to file
  \g | COMMAND   send query buffer to server and pipe results to command
  \p             show the contents of the query buffer
  \r             reset (clear) the query buffer
  \s [FILE]      display history or save it to file
  \w FILE        write query buffer to file

Input/Output
  \echo [STRING] write string to standard output
  \i FILE        execute commands from file
  \o FILE        send all query results to file
  \o | COMMAND   pipe all query results to command
  \o             close query-results file or pipe
  \qecho [STRING]
                 write string to query output stream (see \o)

Informational
  \d [PATTERN]   describe tables (list tables if no argument is supplied)
                 PATTERN may include system schema name, e.g. v_catalog.*
  \df [PATTERN]  list functions
  \dj [PATTERN]  list projections
  \dn [PATTERN]  list schemas
  \dp [PATTERN]  list table access privileges
  \ds [PATTERN]  list sequences
  \dS [PATTERN]  list system tables. PATTERN may include system schema name
                 such as v_catalog, v_monitor, or v_internal.
                 Example: v_catalog.a*
  \dt [PATTERN]  list tables
  \dtv [PATTERN] list tables and views
  \dT [PATTERN]  list data types
  \du [PATTERN]  list users
  \dv [PATTERN]  list views
  \l             list all databases
  \z [PATTERN]   list table access privileges (same as \dp)

Formatting
  \a             toggle between unaligned and aligned output mode
  \b             toggle beep on command completion
  \C [STRING]    set table title, or unset if none
  \f [STRING]    show or set field separator for unaligned query output
  \H             toggle HTML output mode (currently off)
  \pset NAME [VALUE]
                 set table output option
                 (NAME := {format|border|expanded|fieldsep|footer|null|
                 recordsep|trailingrecordsep|tuples_only|title|tableattr|pager})
  \t             show only rows (currently off)
  \T [STRING]    set HTML <table> tag attributes, or unset if none
  \x             toggle expanded output (currently off)
```
자세하 내용은 [매뉴얼]( https://www.vertica.com/docs/9.3.x/HTML/Content/Authoring/ConnectingToVertica/vsql/Meta-Commands/Meta-Commands.htm?tocpath=Connecting%20to%20Vertica%7CUsing%20vsql%7CMeta-Commands%7C_____0)을 참고 하기 바란다.
