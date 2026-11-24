import type { Messages } from "./en.ts";

export const ja: Messages = {
  app: {
    eyebrow: "焙煎所バックオフィス",
    title: "コーヒーカタログ",
    market: "販売国",
    pricesOn: "価格の基準日",
    language: "言語",
  },
  table: {
    sku: "SKU",
    roast: "焙煎度",
    origin: "産地",
    price: "価格",
    empty: "{{market}}ではこの日に販売中の商品はありません。",
  },
  roast: {
    light: "浅煎り",
    medium: "中煎り",
    dark: "深煎り",
  },
  detail: {
    label: "{{code}} の詳細",
    close: "詳細を閉じる",
    priceHistory: "価格履歴",
    now: "現在",
    newPrice: "{{market}}の新価格",
    from: "適用開始日",
    price: "価格（{{currency}}）",
    setPrice: "価格を設定",
    discontinue: "販売終了",
    discontinueOn: "終了日",
    discontinueAction: "販売終了にする",
    events: "イベント",
  },
  event: {
    launch: "発売",
    price_change: "価格改定",
    discontinue: "販売終了",
    launchedAt: "{{amount}}で発売",
    newPrice: "新価格 {{amount}}",
    discontinued: "販売を終了",
  },
  message: {
    enterPrice: "{{currency}}で価格を入力してください",
    priceSet: "{{date}}から{{market}}の新価格を適用します",
    discontinuedFrom: "{{date}}から販売終了にしました",
  },
};
