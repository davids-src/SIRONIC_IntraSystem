export async function generatePdfFromElement(
  el: HTMLElement,
  filename: string,
): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
    }),
  );

  const html2pdf = (await import("html2pdf.js" as any)).default;

  const opt = {
    margin: 0,
    filename,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1024,
    },
    jsPDF: {
      unit: "mm" as const,
      format: "a4" as const,
      orientation: "portrait" as const,
    },
    pagebreak: {
      mode: ["avoid-all", "css", "legacy"],
      avoid: ["tr", "td", "h1", "h2", "h3", "h4", "div", "p"],
    },
  };

  await html2pdf().from(el).set(opt).save();
}
