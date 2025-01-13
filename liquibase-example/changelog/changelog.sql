--liquibase formatted sql

--changeset mezentseva.pa@edu.spbstu.ru:create-person-table-sql
create table person_sql (
    id serial primary key not null,
    name varchar(50) not null,
    address varchar(50),
    city varchar(30)
); 