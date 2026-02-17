## การสร้างไฟล์สคริปต์ db-migration

เราใช้ library ที่ชื่อว่า **Knex** เพื่อช่วยในการสร้างไฟล์สคริปต์ db-migration
สร้างไฟล์ migration ใหม่ด้วยคำสั่ง:
```bash
npx knex migrate:make reate_profile_cms_tables
```
ไฟล์สคริปต์ที่สร้างขึ้นจะถูกเก็บไว้ในโฟลเดอร์ `migrations` และจะมีชื่อไฟล์ตามรูปแบบ `YYYYMMDDHHMMSS_create_users_table.js` ซึ่งช่วยให้สามารถติดตามลำดับการเปลี่ยนแปลงได้
การรัน db-migration


เมื่อมีการสร้างไฟล์สคริปต์ db-migration แล้ว เราสามารถรันการเปลี่ยนแปลงฐานข้อมูลได้โดยใช้คำสั่ง `knex migrate:latest` ซึ่งจะทำการรันไฟล์สคริปต์ทั้งหมดที่ยังไม่ได้รัน
ตัวอย่างการรัน db-migration
**โปรเจคของเราจะมีฟังชั่นที่รันคำสั่งนี้ทุกครั้งเมื่อ start-up โปรเจคอยู่เเล้ว**
```bash
npx knex migrate:latest
```

การย้อนกลับ db-migration
หากต้องการย้อนกลับการเปลี่ยนแปลงฐานข้อมูล สามารถใช้คำสั่ง `knex migrate:rollback` ซึ่งจะย้อนกลับการเปลี่ยนแปลงล่าสุดที่ได้ทำไป
ตัวอย่างการย้อนกลับ db-migration
```bash
npx knex migrate:rollback
```

การตรวจสอบสถานะ db-migration
สามารถตรวจสอบสถานะของ db-migration ได้โดยใช้คำสั่ง `knex migrate:status` ซึ่งจะแสดงรายการไฟล์สคริปต์ที่ได้รันไปแล้วและยังไม่ได้รัน
**หรือสามารถตรวจสอบได้ผ่าน table_knex_migrations ซึ่งจะเเสดงไฟล์ที่รันไปเเล้วทั้งหมด**
ตัวอย่างการตรวจสอบสถานะ db-migration
```bash
npx knex migrate:status
```
