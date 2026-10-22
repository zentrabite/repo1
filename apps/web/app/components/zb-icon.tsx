// ─── ZentraBite icons ───────────────────────────────────────────────────────
// Our own icon set (Oct 2026). Rounded 24px line icons, each with one accent
// element in Zentra Green, the same idea as the dot in the ZB logo.
//
// GENERATED FILE. Don't edit by hand. The drawings live in
// docs/reference/brand/icons/icons_src.py and both apps get the same copy:
//   python3 docs/reference/brand/icons/gen_tsx.py
//
// Usage:
//   <Icon name="orders" />                 20px, inherits text colour
//   <Icon name="rewards" size=28 accent="#FFC14B" />
//   const Orders = iconComponent("orders")   for places that take a component
//
// The accent colour comes from the `accent` prop, or the CSS variable
// --zb-ia on any parent. Defaults to Zentra Green.

import type { CSSProperties } from "react";

type Mode = "s" | "a" | "f" | "c" | "w";
type El = [tag: "path" | "circle" | "rect", attrs: Record<string, string | number>, mode: Mode];

const ICONS = {"dashboard":[["rect",{"x":3.5,"y":3.5,"width":7.5,"height":9.5,"rx":2.25},"s"],["rect",{"x":13,"y":3.5,"width":7.5,"height":5.5,"rx":2.25},"s"],["rect",{"x":13,"y":11,"width":7.5,"height":9.5,"rx":2.25},"s"],["rect",{"x":3.5,"y":15,"width":7.5,"height":5.5,"rx":2.25},"f"]],"sparkle":[["path",{"d":"M11 3.5c.6 4.3 2.7 6.9 7.5 7.5-4.8.6-6.9 3.2-7.5 7.5-.6-4.3-2.7-6.9-7.5-7.5 4.8-.6 6.9-3.2 7.5-7.5Z"},"s"],["circle",{"cx":19,"cy":18.5,"r":1.75},"f"]],"docket":[["path",{"d":"M6.5 3h11a1.5 1.5 0 0 1 1.5 1.5V21l-2.33-1.5-2.33 1.5L12 19.5 9.67 21l-2.34-1.5L5 21V4.5A1.5 1.5 0 0 1 6.5 3Z"},"s"],["path",{"d":"M8.75 7.75h6.5"},"s"],["path",{"d":"M8.75 11.5h6.5"},"s"],["path",{"d":"M8.75 15.25h3"},"s"],["circle",{"cx":15.25,"cy":15.25,"r":1.4},"f"]],"box":[["path",{"d":"M12 3 20.5 7.5 12 12 3.5 7.5 12 3Z"},"f"],["path",{"d":"M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"},"s"],["path",{"d":"M3.5 7.5 12 12l8.5-4.5"},"s"],["path",{"d":"M12 12v9"},"s"]],"box-check":[["path",{"d":"M3.5 7.5 12 3l8.5 4.5v4"},"s"],["path",{"d":"M12 21l-8.5-4.5v-9"},"s"],["path",{"d":"M3.5 7.5 12 12l8.5-4.5"},"s"],["path",{"d":"M12 12v9"},"s"],["circle",{"cx":17.75,"cy":17.75,"r":4.5},"f"],["path",{"d":"M15.75 17.85l1.35 1.35 2.65-2.8"},"w"]],"terminal":[["rect",{"x":5,"y":2.75,"width":14,"height":18.5,"rx":2.5},"s"],["rect",{"x":8,"y":5.75,"width":8,"height":5,"rx":1.25},"f"],["circle",{"cx":9,"cy":14.5,"r":0.95},"c"],["circle",{"cx":12,"cy":14.5,"r":0.95},"c"],["circle",{"cx":15,"cy":14.5,"r":0.95},"c"],["circle",{"cx":9,"cy":17.75,"r":0.95},"c"],["circle",{"cx":12,"cy":17.75,"r":0.95},"c"],["circle",{"cx":15,"cy":17.75,"r":0.95},"c"]],"cloche":[["path",{"d":"M4 16.5a8 8 0 0 1 16 0"},"s"],["path",{"d":"M2.75 16.5h18.5"},"s"],["path",{"d":"M7 20h10"},"s"],["path",{"d":"M8.25 12.75a4.6 4.6 0 0 1 2.6-2.9"},"s"],["circle",{"cx":12,"cy":6.4,"r":1.85},"f"]],"crates":[["rect",{"x":3,"y":12.5,"width":8,"height":8,"rx":1.75},"s"],["rect",{"x":13,"y":12.5,"width":8,"height":8,"rx":1.75},"s"],["rect",{"x":8,"y":3.5,"width":8,"height":7.5,"rx":1.75},"f"],["path",{"d":"M3 15.5h8"},"s"],["path",{"d":"M13 15.5h8"},"s"]],"phone-wave":[["path",{"d":"M6 3.5h2.6a1 1 0 0 1 .94.66l1.2 3.3a1 1 0 0 1-.3 1.1L8.8 9.8a11 11 0 0 0 5.4 5.4l1.24-1.64a1 1 0 0 1 1.1-.3l3.3 1.2a1 1 0 0 1 .66.94V18a2.5 2.5 0 0 1-2.5 2.5C10.2 20.5 3.5 13.8 3.5 6A2.5 2.5 0 0 1 6 3.5Z"},"s"],["path",{"d":"M14.5 3.75a6 6 0 0 1 5.75 5.75"},"a"],["path",{"d":"M14.5 7.25a2.5 2.5 0 0 1 2.25 2.25"},"a"]],"scooter":[["circle",{"cx":6,"cy":18,"r":2.25},"s"],["circle",{"cx":18.25,"cy":18,"r":2.25},"s"],["path",{"d":"M3.5 14.25v-.75a2 2 0 0 1 2-2h5.25L12.5 18h3.5"},"s"],["path",{"d":"M18.25 18 16 8"},"s"],["path",{"d":"M14.5 8h3"},"s"],["rect",{"x":3.75,"y":5,"width":6.5,"height":4.5,"rx":1.25},"f"]],"rider":[["circle",{"cx":9.5,"cy":7.75,"r":3.5},"s"],["path",{"d":"M3 20.5a6.5 6.5 0 0 1 11.6-4"},"s"],["path",{"d":"M18.25 21.25s-3.25-3-3.25-5.5a3.25 3.25 0 0 1 6.5 0c0 2.5-3.25 5.5-3.25 5.5Z"},"f"]],"review":[["path",{"d":"M5.5 3.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H11l-4.75 4v-4H5.5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"},"s"],["path",{"d":"M12.00 6.00L13.08 8.61L15.90 8.83L13.75 10.67L14.41 13.42L12.00 11.95L9.59 13.42L10.25 10.67L8.10 8.83L10.92 8.61Z"},"f"]],"users":[["circle",{"cx":9,"cy":8,"r":3.5},"s"],["path",{"d":"M2.75 20.25a6.25 6.25 0 0 1 12.5 0"},"s"],["circle",{"cx":17,"cy":9.25,"r":2.6},"f"],["path",{"d":"M16 13.85a5 5 0 0 1 5.25 5.4"},"s"]],"user":[["circle",{"cx":12,"cy":8,"r":3.75},"s"],["path",{"d":"M4.75 20.5a7.25 7.25 0 0 1 14.5 0"},"s"]],"user-plus":[["circle",{"cx":9.5,"cy":8,"r":3.5},"s"],["path",{"d":"M3 20.5a6.5 6.5 0 0 1 13 0"},"s"],["path",{"d":"M19 8v6"},"a"],["path",{"d":"M16 11h6"},"a"]],"gift":[["rect",{"x":4,"y":10,"width":16,"height":10.75,"rx":1.5},"s"],["rect",{"x":3,"y":6.75,"width":18,"height":3.25,"rx":1.25},"s"],["path",{"d":"M12 6.75v14"},"s"],["path",{"d":"M12 6.75C9.6 3.4 6.2 3.6 6.7 5.6c.3 1 2.3 1.15 5.3 1.15Z"},"a"],["path",{"d":"M12 6.75c2.4-3.35 5.8-3.15 5.3-1.15-.3 1-2.3 1.15-5.3 1.15Z"},"a"]],"winback":[["path",{"d":"M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"},"s"],["path",{"d":"M4.5 4.75V9h4.25"},"s"],["path",{"d":"M12 15.4s-3.3-1.95-3.3-4.25a1.8 1.8 0 0 1 3.3-1 1.8 1.8 0 0 1 3.3 1c0 2.3-3.3 4.25-3.3 4.25Z"},"f"]],"flow":[["circle",{"cx":5.5,"cy":5.5,"r":2.5},"s"],["circle",{"cx":5.5,"cy":18.5,"r":2.5},"s"],["path",{"d":"M8 5.5h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8"},"s"],["path",{"d":"M12 12h2.25"},"s"],["rect",{"x":14.25,"y":9,"width":7,"height":6,"rx":2},"f"]],"chart":[["rect",{"x":3.75,"y":12,"width":4.25,"height":8.5,"rx":1.25},"s"],["rect",{"x":9.9,"y":7.75,"width":4.25,"height":12.75,"rx":1.25},"s"],["rect",{"x":16,"y":3.5,"width":4.25,"height":17,"rx":1.25},"f"]],"coin":[["circle",{"cx":12,"cy":12,"r":8.75},"s"],["path",{"d":"M14.6 9.3c-.4-.95-1.4-1.55-2.65-1.55-1.55 0-2.65.8-2.65 1.95 0 2.65 5.45 1.5 5.45 4.45 0 1.15-1.2 2.05-2.85 2.05-1.35 0-2.45-.65-2.85-1.65"},"a"],["path",{"d":"M12 6.25v1.5"},"a"],["path",{"d":"M12 16.25v1.5"},"a"]],"calendar":[["rect",{"x":3.5,"y":5,"width":17,"height":15.75,"rx":2.5},"s"],["path",{"d":"M8 3v4"},"s"],["path",{"d":"M16 3v4"},"s"],["path",{"d":"M3.5 10h17"},"s"],["rect",{"x":13.25,"y":13,"width":4,"height":4,"rx":1.1},"f"]],"sliders":[["path",{"d":"M4 7h8.5"},"s"],["path",{"d":"M17.5 7H20"},"s"],["circle",{"cx":15,"cy":7,"r":2.25},"s"],["path",{"d":"M4 12h2.5"},"s"],["path",{"d":"M11.5 12H20"},"s"],["circle",{"cx":9,"cy":12,"r":2.25},"f"],["path",{"d":"M4 17h10.5"},"s"],["path",{"d":"M19.5 17h.5"},"s"],["circle",{"cx":17,"cy":17,"r":2.25},"s"]],"store":[["path",{"d":"M4.5 4.25h15l1.5 5.25a2.75 2.75 0 0 1-5.5 0 3 3 0 0 1-6 0 2.75 2.75 0 0 1-5.5 0l1.5-5.25Z"},"s"],["path",{"d":"M5 12.4v8.1h14v-8.1"},"s"],["path",{"d":"M10 20.5v-4.25a2 2 0 0 1 4 0v4.25"},"a"]],"bag":[["path",{"d":"M5.5 8h13l-.95 12a1.5 1.5 0 0 1-1.5 1.4H7.95a1.5 1.5 0 0 1-1.5-1.4L5.5 8Z"},"s"],["path",{"d":"M9 10.5V7a3 3 0 0 1 6 0v3.5"},"s"],["circle",{"cx":12,"cy":15.25,"r":1.75},"f"]],"megaphone":[["path",{"d":"M4 10v4a1 1 0 0 0 1 1h2.25l7.25 4.25V4.75L7.25 9H5a1 1 0 0 0-1 1Z"},"s"],["path",{"d":"M7.25 15l1.25 4.75"},"s"],["path",{"d":"M18 9a4 4 0 0 1 0 6"},"a"],["path",{"d":"M20.25 6.75a7 7 0 0 1 0 10.5"},"a"]],"trophy":[["path",{"d":"M7 3.75h10v5a5 5 0 0 1-10 0v-5Z"},"s"],["path",{"d":"M7 5.75H4.75a2.5 2.5 0 0 0 2.6 3.9"},"s"],["path",{"d":"M17 5.75h2.25a2.5 2.5 0 0 1-2.6 3.9"},"s"],["path",{"d":"M12 13.75v3.5"},"s"],["path",{"d":"M8 20.5h8"},"s"],["path",{"d":"M9.5 17.25h5"},"s"],["circle",{"cx":12,"cy":8.25,"r":1.6},"f"]],"medal":[["path",{"d":"M8 3.25l3.1 6.6"},"s"],["path",{"d":"M16 3.25l-3.1 6.6"},"s"],["circle",{"cx":12,"cy":15,"r":5.25},"s"],["circle",{"cx":12,"cy":15,"r":2.5},"f"]],"crown":[["path",{"d":"M4.25 17.25 3 7.75l5 4 4-6.25 4 6.25 5-4-1.25 9.5H4.25Z"},"s"],["path",{"d":"M4.5 20.5h15"},"s"],["circle",{"cx":12,"cy":13.75,"r":1.5},"f"]],"infinity":[["path",{"d":"M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4Z"},"s"],["path",{"d":"M12 12c2 2.6 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.4-5.5 4Z"},"a"]],"trend-up":[["path",{"d":"M3.5 17.5 9 12l3.5 3.5 7-7"},"s"],["path",{"d":"M15 8.5h4.5V13"},"a"]],"trend-down":[["path",{"d":"M3.5 6.5 9 12l3.5-3.5 7 7"},"s"],["path",{"d":"M15 15.5h4.5V11"},"a"]],"refresh":[["path",{"d":"M19.5 12a7.5 7.5 0 0 1-13.25 4.8"},"s"],["path",{"d":"M4.5 12a7.5 7.5 0 0 1 13.25-4.8"},"s"],["path",{"d":"M18.25 3.75v3.75H14.5"},"a"],["path",{"d":"M5.75 20.25V16.5H9.5"},"s"]],"bolt":[["path",{"d":"M13.25 2.75 5 13.5h6.25l-.75 7.75L19 10.5h-6.25l.5-7.75Z"},"f"]],"target":[["circle",{"cx":12,"cy":12,"r":8.75},"s"],["circle",{"cx":12,"cy":12,"r":5},"s"],["circle",{"cx":12,"cy":12,"r":1.9},"f"]],"pulse":[["path",{"d":"M3 12h4l2.5-6.5 4 13 2.5-6.5H21"},"s"],["circle",{"cx":9.5,"cy":5.5,"r":1.5},"f"]],"check-circle":[["circle",{"cx":12,"cy":12,"r":8.75},"s"],["path",{"d":"M8.5 12.25l2.4 2.4 4.85-5"},"a"]],"check":[["path",{"d":"M5 12.5l4.5 4.5L19 7.5"},"a"]],"x":[["path",{"d":"M6.5 6.5l11 11"},"s"],["path",{"d":"M17.5 6.5l-11 11"},"s"]],"plus":[["path",{"d":"M12 5v14"},"s"],["path",{"d":"M5 12h14"},"s"]],"alert":[["path",{"d":"M10.27 4.2a2 2 0 0 1 3.46 0l7.4 12.8a2 2 0 0 1-1.73 3H4.6a2 2 0 0 1-1.73-3l7.4-12.8Z"},"s"],["path",{"d":"M12 9.25v4"},"s"],["circle",{"cx":12,"cy":16.6,"r":1.15},"f"]],"info":[["circle",{"cx":12,"cy":12,"r":8.75},"s"],["path",{"d":"M12 11v5.25"},"s"],["circle",{"cx":12,"cy":7.75,"r":1.15},"f"]],"bell":[["path",{"d":"M6 16.25V11a6 6 0 0 1 12 0v5.25l1.5 2H4.5l1.5-2Z"},"s"],["path",{"d":"M10 20.75a2 2 0 0 0 4 0"},"s"],["circle",{"cx":18.25,"cy":5.25,"r":2.5},"f"]],"search":[["circle",{"cx":10.5,"cy":10.5,"r":6.75},"s"],["path",{"d":"M15.5 15.5 20.25 20.25"},"a"]],"send":[["path",{"d":"M20.75 3.25 3.25 10.5l7.2 3 3 7.25 7.3-17.5Z"},"s"],["path",{"d":"M10.45 13.5l4.3-4.3"},"a"]],"logout":[["path",{"d":"M10 3.75H6.25a2 2 0 0 0-2 2v12.5a2 2 0 0 0 2 2H10"},"s"],["path",{"d":"M15 8l4 4-4 4"},"a"],["path",{"d":"M19 12H9.25"},"a"]],"arrow-right":[["path",{"d":"M4.5 12h15"},"s"],["path",{"d":"M13.5 6l6 6-6 6"},"a"]],"external":[["path",{"d":"M14 4.5h5.5V10"},"a"],["path",{"d":"M19.5 4.5 11 13"},"a"],["path",{"d":"M18 14.5v3.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5"},"s"]],"eye":[["path",{"d":"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"},"s"],["circle",{"cx":12,"cy":12,"r":2.9},"f"]],"lock":[["rect",{"x":4.75,"y":10.5,"width":14.5,"height":10.25,"rx":2.5},"s"],["path",{"d":"M8 10.5V8a4 4 0 0 1 8 0v2.5"},"s"],["circle",{"cx":12,"cy":15.6,"r":1.6},"f"]],"key":[["circle",{"cx":8,"cy":15.5,"r":4.25},"s"],["path",{"d":"M11 12.5 19.5 4"},"s"],["path",{"d":"M17 6.5l2.25 2.25"},"s"],["path",{"d":"M14.5 9l1.75 1.75"},"s"],["circle",{"cx":8,"cy":15.5,"r":1.35},"f"]],"shield":[["path",{"d":"M12 3.25 19 5.9v5.6c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V5.9l7-2.65Z"},"s"],["path",{"d":"M9 12.1l2.15 2.15L15.25 10"},"a"]],"trash":[["path",{"d":"M4 6.5h16"},"s"],["path",{"d":"M9 6.5v-2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"},"s"],["path",{"d":"M6 6.5l.95 13a1.5 1.5 0 0 0 1.5 1.4h7.1a1.5 1.5 0 0 0 1.5-1.4L18 6.5"},"s"],["path",{"d":"M10 10.75v6"},"a"],["path",{"d":"M14 10.75v6"},"a"]],"printer":[["path",{"d":"M7 8.5v-5h10v5"},"s"],["path",{"d":"M6.5 17.25H4.75a1.25 1.25 0 0 1-1.25-1.25v-5a2.5 2.5 0 0 1 2.5-2.5h12a2.5 2.5 0 0 1 2.5 2.5v5a1.25 1.25 0 0 1-1.25 1.25H17.5"},"s"],["rect",{"x":7,"y":13.75,"width":10,"height":7,"rx":1},"s"],["circle",{"cx":17.25,"cy":11.75,"r":1.05},"f"]],"link":[["path",{"d":"M10.25 13.75a4 4 0 0 0 5.65 0l3-3a4 4 0 0 0-5.65-5.65l-1 1"},"s"],["path",{"d":"M13.75 10.25a4 4 0 0 0-5.65 0l-3 3a4 4 0 0 0 5.65 5.65l1-1"},"a"]],"pause":[["path",{"d":"M9 6v12"},"s"],["path",{"d":"M15 6v12"},"a"]],"play":[["path",{"d":"M8 5.25v13.5L18.5 12 8 5.25Z"},"f"]],"edit":[["path",{"d":"M4.5 19.5l.9-3.9L15.6 5.4a2 2 0 0 1 2.85 0l.15.15a2 2 0 0 1 0 2.85L8.4 18.6l-3.9.9Z"},"s"],["path",{"d":"M13.75 7.25l3 3"},"a"]],"mail":[["rect",{"x":3,"y":5.5,"width":18,"height":13,"rx":2.5},"s"],["path",{"d":"M3.75 7.25 12 13l8.25-5.75"},"a"]],"chat":[["path",{"d":"M20 11.5a7.75 7.75 0 0 1-11.2 6.95L4 19.75l1.35-4.4A7.75 7.75 0 1 1 20 11.5Z"},"s"],["circle",{"cx":8.6,"cy":11.5,"r":1.1},"f"],["circle",{"cx":12.1,"cy":11.5,"r":1.1},"f"],["circle",{"cx":15.6,"cy":11.5,"r":1.1},"f"]],"smartphone":[["rect",{"x":6.5,"y":2.75,"width":11,"height":18.5,"rx":2.5},"s"],["path",{"d":"M10.5 5.75h3"},"s"],["circle",{"cx":12,"cy":17.9,"r":1.1},"f"]],"headset":[["path",{"d":"M4 13.5V12a8 8 0 0 1 16 0v1.5"},"s"],["rect",{"x":3.5,"y":12.5,"width":4,"height":6.25,"rx":1.5},"s"],["rect",{"x":16.5,"y":12.5,"width":4,"height":6.25,"rx":1.5},"s"],["path",{"d":"M18.5 18.75v.25a2.5 2.5 0 0 1-2.5 2.5h-2.25"},"a"]],"mic":[["rect",{"x":9,"y":3,"width":6,"height":11.5,"rx":3},"a"],["path",{"d":"M5.5 11a6.5 6.5 0 0 0 13 0"},"s"],["path",{"d":"M12 17.5V21"},"s"]],"card":[["rect",{"x":2.75,"y":5.5,"width":18.5,"height":13,"rx":2.5},"s"],["path",{"d":"M2.75 9.75h18.5"},"s"],["rect",{"x":6,"y":13.25,"width":4.5,"height":2.5,"rx":0.9},"f"]],"cash":[["rect",{"x":2.75,"y":6.5,"width":18.5,"height":11,"rx":2.25},"s"],["circle",{"cx":12,"cy":12,"r":2.6},"a"],["path",{"d":"M6.25 12h.01"},"s"],["path",{"d":"M17.75 12h.01"},"s"]],"calculator":[["rect",{"x":5,"y":2.75,"width":14,"height":18.5,"rx":2.5},"s"],["rect",{"x":8,"y":5.75,"width":8,"height":3.75,"rx":0.9},"f"],["circle",{"cx":9,"cy":13.25,"r":0.95},"c"],["circle",{"cx":12,"cy":13.25,"r":0.95},"c"],["circle",{"cx":15,"cy":13.25,"r":0.95},"c"],["circle",{"cx":9,"cy":16.75,"r":0.95},"c"],["circle",{"cx":12,"cy":16.75,"r":0.95},"c"],["circle",{"cx":15,"cy":16.75,"r":0.95},"c"]],"tag":[["path",{"d":"M3.5 11.6V5a1.5 1.5 0 0 1 1.5-1.5h6.6a1.5 1.5 0 0 1 1.06.44l7.6 7.6a1.5 1.5 0 0 1 0 2.12l-6.6 6.6a1.5 1.5 0 0 1-2.12 0l-7.6-7.6a1.5 1.5 0 0 1-.44-1.06Z"},"s"],["circle",{"cx":8,"cy":8,"r":1.6},"f"]],"plate":[["circle",{"cx":12.6,"cy":12,"r":4.6},"s"],["circle",{"cx":12.6,"cy":12,"r":1.9},"a"],["path",{"d":"M3.5 3.5v4A1.5 1.5 0 0 0 5 9a1.5 1.5 0 0 0 1.5-1.5v-4"},"s"],["path",{"d":"M5 3.5v17"},"s"],["path",{"d":"M20.75 20.5V3.5c-1.5 1-2.25 2.9-2.25 5.6v3.9h2.25"},"s"]],"takeaway":[["path",{"d":"M5 9.25h14l-1.55 10.6a1.5 1.5 0 0 1-1.48 1.28H8.03a1.5 1.5 0 0 1-1.48-1.28L5 9.25Z"},"s"],["path",{"d":"M5 9.25 7 5.25h10l2 4"},"s"],["path",{"d":"M12.5 9.25 16 2.75"},"a"],["path",{"d":"M15 9.25l3.75-5"},"a"]],"chef":[["path",{"d":"M7 14.25a4 4 0 0 1-.6-7.95 5.6 5.6 0 0 1 11.2 0 4 4 0 0 1-.6 7.95v6H7v-6Z"},"s"],["path",{"d":"M7 17.25h10"},"a"]],"leaf":[["path",{"d":"M5 19.25C5 11 10 5.5 19.5 4.5 19 13.25 13.75 18.75 5.5 19.25"},"s"],["path",{"d":"M5 19.25c3-4 6-7 9.75-9.5"},"a"]],"flame":[["path",{"d":"M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-4-6.5-4-10.75-3 1.5-4.5 4-4.5 6.25-1-.5-1.8-1.6-2-3.1C6.5 8.4 5.5 11 5.5 14.5A6.5 6.5 0 0 0 12 21Z"},"s"],["path",{"d":"M12 21a2.75 2.75 0 0 1-2.75-2.75c0-2 2.75-4 2.75-4s2.75 2 2.75 4A2.75 2.75 0 0 1 12 21Z"},"f"]],"cake":[["rect",{"x":4,"y":12,"width":16,"height":8.75,"rx":2},"s"],["path",{"d":"M4 15.6c1.35 0 1.35 1 2.65 1s1.35-1 2.7-1 1.35 1 2.65 1 1.35-1 2.7-1 1.35 1 2.65 1 1.35-1 2.65-1"},"s"],["path",{"d":"M12 12V8.75"},"s"],["path",{"d":"M12 7c-.9 0-1.45-.7-1.45-1.45 0-.95 1.45-2.55 1.45-2.55s1.45 1.6 1.45 2.55C13.45 6.3 12.9 7 12 7Z"},"f"]],"heart":[["path",{"d":"M12 20.25s-7.75-4.7-7.75-10.25A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.75 2.6c0 5.55-7.75 10.25-7.75 10.25Z"},"f"]],"star":[["path",{"d":"M12.00 3.50L14.38 9.22L20.56 9.72L15.85 13.75L17.29 19.78L12.00 16.55L6.71 19.78L8.15 13.75L3.44 9.72L9.62 9.22Z"},"s"]],"star-fill":[["path",{"d":"M12.00 3.50L14.38 9.22L20.56 9.72L15.85 13.75L17.29 19.78L12.00 16.55L6.71 19.78L8.15 13.75L3.44 9.72L9.62 9.22Z"},"f"]],"pin":[["path",{"d":"M12 21.25s-6.75-5.75-6.75-11.25a6.75 6.75 0 0 1 13.5 0c0 5.5-6.75 11.25-6.75 11.25Z"},"s"],["circle",{"cx":12,"cy":10,"r":2.4},"f"]],"clock":[["circle",{"cx":12,"cy":12,"r":8.75},"s"],["path",{"d":"M12 7.25V12l3.25 2"},"a"]],"sunrise":[["path",{"d":"M6.5 17.5a5.5 5.5 0 0 1 11 0"},"a"],["path",{"d":"M3 17.5h18"},"s"],["path",{"d":"M7.5 21h9"},"s"],["path",{"d":"M12 5.5V8"},"s"],["path",{"d":"M5.6 9.6l1.75 1.75"},"s"],["path",{"d":"M18.4 9.6l-1.75 1.75"},"s"]],"car":[["path",{"d":"M5 16.5v-4l1.9-4.6a2 2 0 0 1 1.85-1.25h6.5a2 2 0 0 1 1.85 1.25L19 12.5v4"},"s"],["rect",{"x":3.5,"y":12.5,"width":17,"height":5,"rx":1.75},"s"],["circle",{"cx":7.5,"cy":15,"r":1.2},"f"],["circle",{"cx":16.5,"cy":15,"r":1.2},"f"],["path",{"d":"M6 17.5v2"},"s"],["path",{"d":"M18 17.5v2"},"s"]],"palette":[["path",{"d":"M12 3.25a8.75 8.75 0 0 0 0 17.5c1.25 0 1.85-.8 1.85-1.75 0-1.2-1-1.6-1-2.6 0-.95.75-1.6 1.75-1.6h2.25a3.9 3.9 0 0 0 3.9-3.9c0-4.3-3.95-7.65-8.75-7.65Z"},"s"],["circle",{"cx":7.75,"cy":11,"r":1.35},"f"],["circle",{"cx":10,"cy":7.25,"r":1.15},"c"],["circle",{"cx":14.75,"cy":7.25,"r":1.15},"c"]],"globe":[["circle",{"cx":12,"cy":12,"r":8.75},"s"],["path",{"d":"M3.25 12h17.5"},"s"],["path",{"d":"M12 3.25c2.35 2.35 3.6 5.3 3.6 8.75s-1.25 6.4-3.6 8.75c-2.35-2.35-3.6-5.3-3.6-8.75S9.65 5.6 12 3.25Z"},"a"]],"home":[["path",{"d":"M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z"},"s"],["path",{"d":"M10 20.5v-4.75a2 2 0 0 1 4 0v4.75"},"a"]],"wrench":[["path",{"d":"M14.6 3.75a5.1 5.1 0 0 0-5.35 7.05L3.9 16.15a1.85 1.85 0 0 0 2.6 2.6l5.35-5.35a5.1 5.1 0 0 0 7.05-5.35l-2.85 2.85-2.75-.75-.75-2.75 2.85-2.85a5 5 0 0 0-.8-.8Z"},"s"],["circle",{"cx":5.2,"cy":17.45,"r":0.95},"f"]],"scissors":[["circle",{"cx":6.5,"cy":6.5,"r":2.75},"s"],["circle",{"cx":6.5,"cy":17.5,"r":2.75},"s"],["path",{"d":"M8.75 8.1 20 18.75"},"s"],["path",{"d":"M8.75 15.9 20 5.25"},"a"]],"dumbbell":[["rect",{"x":3,"y":8.5,"width":3.5,"height":7,"rx":1.2},"s"],["rect",{"x":17.5,"y":8.5,"width":3.5,"height":7,"rx":1.2},"s"],["path",{"d":"M6.5 12h11"},"a"],["path",{"d":"M1.75 12h1.25"},"s"],["path",{"d":"M21 12h1.25"},"s"]],"camera":[["path",{"d":"M4 7.75h3l1.5-2.5h7l1.5 2.5h3A1.25 1.25 0 0 1 21.25 9v9.5A1.25 1.25 0 0 1 20 19.75H4A1.25 1.25 0 0 1 2.75 18.5V9A1.25 1.25 0 0 1 4 7.75Z"},"s"],["circle",{"cx":12,"cy":13.5,"r":3.5},"a"],["circle",{"cx":18,"cy":10.5,"r":0.9},"c"]],"grid":[["rect",{"x":3.5,"y":3.5,"width":7.25,"height":7.25,"rx":2},"s"],["rect",{"x":13.25,"y":3.5,"width":7.25,"height":7.25,"rx":2},"s"],["rect",{"x":3.5,"y":13.25,"width":7.25,"height":7.25,"rx":2},"s"],["rect",{"x":13.25,"y":13.25,"width":7.25,"height":7.25,"rx":2},"f"]],"dot":[["circle",{"cx":12,"cy":12,"r":4.5},"f"]]} as const satisfies Record<string, readonly (readonly unknown[])[]>;

const ALIASES = {
  "orders": "docket",
  "fulfillment": "box-check",
  "pos": "terminal",
  "menu": "cloche",
  "stock": "crates",
  "ai-calls": "phone-wave",
  "phone": "phone-wave",
  "delivery": "scooter",
  "drivers": "rider",
  "reviews": "review",
  "customers": "users",
  "rewards": "gift",
  "automations": "flow",
  "analytics": "chart",
  "financials": "coin",
  "rostering": "calendar",
  "settings": "sliders",
  "copilot": "sparkle",
  "ai": "sparkle",
  "campaigns": "megaphone",
  "storefront": "bag",
  "business": "store",
  "money": "coin",
  "package": "box",
  "modules": "grid",
  "health": "pulse",
  "support": "headset",
  "dine-in": "plate",
  "website": "globe",
  "branding": "palette",
  "hours": "clock",
  "location": "pin",
  "sms": "chat",
  "email": "mail",
  "loyalty": "star-fill",
  "vip": "crown",
  "tier": "medal",
  "referral": "user-plus",
  "birthday": "cake",
  "streak": "flame",
  "insight": "sparkle",
  "goal": "target",
  "security": "shield",
  "kitchen": "chef",
  "vegetarian": "leaf",
  "voice": "mic",
  "brief": "sunrise",
  "growth": "trend-up",
  "decline": "trend-down",
  "forever": "infinity",
  "return": "winback",
  "fast": "bolt",
  "delete": "trash",
  "print": "printer",
  "integrations": "link",
  "view": "eye",
  "ops": "wrench",
  "salon": "scissors",
  "gym": "dumbbell",
  "trades": "wrench",
  "bookings": "calendar",
  "photo": "camera",
  "price": "tag",
  "notifications": "bell",
  "receipt": "docket",
  "warning": "alert",
  "done": "check-circle"
} as const;

export type IconName = keyof typeof ICONS | keyof typeof ALIASES;
export const ICON_NAMES = Object.keys(ICONS) as (keyof typeof ICONS)[];

/** True when a string is one of our icon names or aliases (not an emoji or text). */
export function isIconName(x: unknown): x is IconName {
  return typeof x === "string" && (x in ICONS || x in ALIASES);
}

const MODE: Record<Mode, Record<string, string>> = {
  s: {},
  a: { stroke: "var(--zb-ia, #00B67A)" },
  f: { fill: "var(--zb-ia, #00B67A)", stroke: "none" },
  c: { fill: "currentColor", stroke: "none" },
  w: { stroke: "var(--zb-ib, #FFFFFF)" },
};

export type IconProps = {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
  /** Accent colour for this icon. Defaults to --zb-ia, then Zentra Green. */
  accent?: string;
  /** Label for screen readers. Leave out when the icon sits next to text. */
  title?: string;
  className?: string;
  style?: CSSProperties;
};

export function Icon({ name, size = 20, strokeWidth = 1.75, accent, title, className, style }: IconProps) {
  const key = (ALIASES as Record<string, string>)[name] ?? name;
  const els = (ICONS as unknown as Record<string, El[]>)[key];
  if (!els) return null;
  const vars = accent ? ({ ["--zb-ia" as string]: accent } as CSSProperties) : undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...vars, ...style }}
    >
      {title ? <title>{title}</title> : null}
      {els.map(([tag, attrs, mode], i) => {
        const Tag = tag;
        return <Tag key={i} {...attrs} {...MODE[mode]} />;
      })}
    </svg>
  );
}

/** A component for one icon, for places that expect a component (like nav items). */
export function iconComponent(name: IconName) {
  function ZbIcon(props: Omit<IconProps, "name">) {
    return <Icon name={name} {...props} />;
  }
  ZbIcon.displayName = `Icon(${name})`;
  return ZbIcon;
}

export type IconComponent = ReturnType<typeof iconComponent>;
