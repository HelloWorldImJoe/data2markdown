import { generateDailyReport } from "./newsletter/dailyReport";
import { post2planet } from "./post2planet";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    return new Response("Hello World!");
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        try {
          const cron = (controller as any)?.cron as string | undefined;
          if (cron === "58 23 * * *" || !cron) {
            try {
              const content = await generateDailyReport(env);
              await post2planet(env, content);
            } catch (e) {
              console.error("generateDaily failed:", e);
            }
          }
        } catch (e) {
          console.error("[scheduled] task failed:", e);
        }
      })()
    );
  },
} satisfies ExportedHandler<Env>;
