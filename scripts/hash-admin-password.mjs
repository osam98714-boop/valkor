import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
  console.error("شغّل هذا الملف داخل طرفية تفاعلية حتى تبقى كلمة المرور مخفية.");
  process.exit(1);
}

stdout.write("كلمة مرور المدير (12 حرفًا على الأقل؛ لن تظهر أثناء الكتابة): ");
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");
let password = "";
const finish = () => {
  stdin.setRawMode(false);
  stdin.pause();
};
stdin.on("data", chunk => {
  for (const character of chunk) {
    if (character === "\u0003") {
      finish();
      password = "";
      stdout.write("\nتم الإلغاء.\n");
      process.exit(130);
    }
    if (character === "\r" || character === "\n") {
      finish();
      if (password.length < 12) {
        password = "";
        stdout.write("\nيجب أن تكون كلمة المرور 12 حرفًا على الأقل. أعد التشغيل.\n");
        process.exit(1);
      }
      const salt = randomBytes(16);
      const digest = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
      password = "";
      stdout.write(`\nالتجزئة الآمنة (انسخها إلى نموذج ADMIN_PASSWORD_HASH المحمي فقط):\nscrypt$${salt.toString("hex")}$${digest.toString("hex")}\n`);
      process.exit(0);
    }
    if (character === "\u007f" || character === "\b") password = password.slice(0, -1);
    else if (character >= " ") password += character;
  }
});
