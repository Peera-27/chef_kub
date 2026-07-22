import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * ยังไม่เปิด incremental cache / tag cache เพราะแอปนี้ไม่ได้ใช้ ISR หรือ
 * revalidateTag เลย — หน้าเป็น static ล้วนกับ server action ที่คิดสดทุกครั้ง
 * เปิดไว้เฉย ๆ มีแต่จะต้องผูก KV เพิ่มโดยไม่ได้ประโยชน์
 */
export default defineCloudflareConfig();
