# Supabase Database Schema

Generated at: 2026-10-07T13:56:00.519Z
Host: https://ogvjmrqfqdesjkbjhcmd.supabase.co

## RPC / Functions

- change_username
- respond_to_room_application
- is_property_member

## Tables & Columns

### utility_payments

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| room_id | string | uuid | Note:
This is a Foreign Key to `rooms.id`.<fk table='rooms' column='id'/> |
| property_id | string | uuid | Note:
This is a Foreign Key to `properties.id`.<fk table='properties' column='id'/> |
| utility_type | string | text |  |
| amount | number | numeric |  |
| paid_at | string | timestamp with time zone |  |
| token_code | string | text |  |
| kwh | number | numeric |  |
| meter_reading | number | numeric |  |
| period_label | string | text |  |
| note | string | text |  |
| created_by | string | uuid |  |
| created_by_role | string | text |  |
| created_at | string | timestamp with time zone |  |

### user_phone_numbers

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| user_id | string | uuid |  |
| phone_number | string | text |  |
| label | string | text |  |
| is_primary | boolean | boolean |  |
| created_at | string | timestamp with time zone |  |
| updated_at | string | timestamp with time zone |  |
| verified_at | string | timestamp with time zone |  |

### status_member_property

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| status_id | integer | integer |  |
| name | string | text |  |
| created_at | string | timestamp with time zone |  |
| updated_at | string | timestamp with time zone |  |

### notifications

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| to_user_id | string | uuid |  |
| from_user_id | string | uuid |  |
| property_id | string | uuid | Note:
This is a Foreign Key to `properties.id`.<fk table='properties' column='id'/> |
| room_id | string | uuid | Note:
This is a Foreign Key to `rooms.id`.<fk table='rooms' column='id'/> |
| role_id | string | uuid | Note:
This is a Foreign Key to `roles.id`.<fk table='roles' column='id'/> |
| type | string | text |  |
| title | string | text |  |
| description | string | text |  |
| status | string | text |  |
| read | boolean | boolean |  |
| read_at | string | timestamp with time zone |  |
| responded_at | string | timestamp with time zone |  |
| metadata | - | jsonb |  |
| created_at | string | timestamp with time zone |  |
| updated_at | string | timestamp with time zone |  |
| deleted_at | string | timestamp with time zone |  |

### property_costs

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| property_id | string | uuid | Note:
This is a Foreign Key to `properties.id`.<fk table='properties' column='id'/> |
| category | string | text |  |
| amount | number | numeric |  |
| period | string | date |  |
| note | string | text |  |
| created_by | string | uuid |  |
| created_at | string | timestamp with time zone |  |

### status_profiles

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| created_at | string | timestamp with time zone |  |
| status_name | string | text |  |
| status_id | integer | bigint |  |

### roles

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| name | string | text |  |
| description | string | text |  |
| created_at | string | timestamp with time zone |  |

### property_status

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| status_id | integer | integer |  |
| status_name | string | text |  |
| created_at | string | timestamp with time zone |  |
| updated_at | string | timestamp with time zone |  |

### properties

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| owner_id | string | uuid |  |
| name | string | text |  |
| property_type | string | text |  |
| building_area | number | numeric |  |
| land_area | number | numeric |  |
| electricity_provider | string | text |  |
| water_provider | string | text |  |
| created_at | string | timestamp with time zone |  |
| is_active | boolean | boolean |  |
| location | string | text |  |
| latitude | number | double precision |  |
| longitude | number | double precision |  |
| electricity_customer_id | string | text |  |
| electricity_tariff | string | text |  |
| electricity_power | string | text |  |
| status_id | integer | integer | Note:
This is a Foreign Key to `property_status.status_id`.<fk table='property_status' column='status_id'/> |

### profiles

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| display_name | string | text |  |
| created_at | string | timestamp with time zone |  |
| first_name | string | text |  |
| last_name | string | text |  |
| username | string | text |  |
| avatar_url | string | text |  |
| status_id | integer | bigint | realtion to column status

Note:
This is a Foreign Key to `status_profiles.status_id`.<fk table='status_profiles' column='status_id'/> |
| phone | string | text |  |
| account_status | string | text |  |

### status_member_rooms

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| status_id | integer | integer |  |
| status_name | string | text |  |
| created_at | string | timestamp with time zone |  |
| updated_at | string | timestamp with time zone |  |

### rooms

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| property_id | string | uuid | Note:
This is a Foreign Key to `properties.id`.<fk table='properties' column='id'/> |
| parent_room_id | string | uuid | Note:
This is a Foreign Key to `rooms.id`.<fk table='rooms' column='id'/> |
| name | string | text |  |
| room_type | string | text |  |
| area | number | numeric |  |
| bathroom_count | integer | integer |  |
| notes | string | text |  |
| created_at | string | timestamp with time zone |  |
| updated_at | string | timestamp with time zone |  |
| unit_type | string | text |  |
| bathroom_mode | string | text |  |
| electricity_customer_id | string | text |  |
| electricity_tariff | string | text |  |
| electricity_power | string | text |  |
| water_mode | string | text |  |
| water_customer_id | string | text |  |
| water_provider | string | text |  |
| bathroom_area | number | numeric |  |
| is_active | boolean | boolean |  |
| occupant_name | string | text |  |
| occupant_member_id | string | uuid | Note:
This is a Foreign Key to `property_members.id`.<fk table='property_members' column='id'/> |
| status_id | integer | integer | Note:
This is a Foreign Key to `room_status.status_id`.<fk table='room_status' column='status_id'/> |

### room_status

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| status_id | integer | integer |  |
| status_name | string | text |  |
| created_at | string | timestamp with time zone |  |
| updated_at | string | timestamp with time zone |  |

### bathrooms

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| id | string | uuid | Note:
This is a Primary Key.<pk/> |
| property_id | string | uuid | Note:
This is a Foreign Key to `properties.id`.<fk table='properties' column='id'/> |
| room_id | string | uuid | Note:
This is a Foreign Key to `rooms.id`.<fk table='rooms' column='id'/> |
| name | string | text |  |
| area | number | numeric |  |
| water_mode | string | text |  |
| water_customer_id | string | text |  |
| water_provider | string | text |  |
| created_at | string | timestamp with time zone |  |
| updated_at | string | timestamp with time zone |  |

### usernames

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| user_id | string | uuid | Note:
This is a Primary Key.<pk/> |
| username | string | text |  |
| last_changed_at | string | timestamp with time zone |  |
| created_at | string | timestamp with time zone |  |

### room_members

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| room_id | string | uuid | Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `rooms.id`.<fk table='rooms' column='id'/> |
| user_id | string | uuid | Note:
This is a Primary Key.<pk/> |
| role_id | string | uuid | Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `roles.id`.<fk table='roles' column='id'/> |
| created_at | string | timestamp with time zone |  |
| status_id | integer | integer | Note:
This is a Foreign Key to `status_member_rooms.status_id`.<fk table='status_member_rooms' column='status_id'/> |
| status | string | text |  |
| status_member_room | string | text |  |

### property_members

| Column | Type | Format | Description |
| --- | --- | --- | --- |
| property_id | string | uuid | Note:
This is a Primary Key.<pk/>
This is a Foreign Key to `properties.id`.<fk table='properties' column='id'/> |
| user_id | string | uuid | Note:
This is a Primary Key.<pk/> |
| role | string | text |  |
| created_at | string | timestamp with time zone |  |
| role_id | string | uuid | Note:
This is a Foreign Key to `roles.id`.<fk table='roles' column='id'/> |
| id | string | uuid |  |
| status_id | integer | integer | Note:
This is a Foreign Key to `status_member_property.status_id`.<fk table='status_member_property' column='status_id'/> |
| status | string | text |  |
| status_member_property | string | text |  |

