export function createPdfPreviewPlaceholderHtml(message: string) {
  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;background:#F6F7F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111">
      
      <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;padding:24px;box-sizing:border-box">
        
        <div style="width:min(92vw,420px);background:#fff;border-radius:22px;padding:42px 32px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,0.10);box-sizing:border-box">
          
          <div style="width:46px;height:58px;margin:0 auto 22px;border-radius:8px;background:#F1F5F9;border:1px solid #E2E8F0;position:relative;box-shadow:0 6px 14px rgba(15,23,42,0.08)">
            <div style="position:absolute;top:12px;left:10px;right:10px;height:2px;background:#CBD5E1;border-radius:2px"></div>
            <div style="position:absolute;top:22px;left:10px;right:16px;height:2px;background:#CBD5E1;border-radius:2px"></div>
            <div style="position:absolute;top:32px;left:10px;right:12px;height:2px;background:#CBD5E1;border-radius:2px"></div>
          </div>

          <p style="font-size:clamp(20px,6vw,28px);font-weight:600;line-height:1.35;margin:0;color:#111;letter-spacing:0.2px">
            ${message}
          </p>

          <div style="height:4px;width:120px;background:#E5E7EB;border-radius:999px;margin:26px auto 0;overflow:hidden">
            <div style="height:100%;width:42%;background:#42A5F5;border-radius:999px;animation:bar 1.2s ease-in-out infinite"></div>
          </div>

        </div>

      </div>

      <style>
        @keyframes bar {
          0% { transform: translateX(-120%) }
          50% { transform: translateX(80%) }
          100% { transform: translateX(240%) }
        }
      </style>

    </body>
  </html>
  `;
}