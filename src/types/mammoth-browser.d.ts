declare module "mammoth/mammoth.browser.js" {
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
  const _default: { convertToHtml: typeof convertToHtml };
  export default _default;
}
