export default function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 18,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "70px"})`,
        zIndex: 200,
        padding: "9px 20px",
        borderRadius: 10,
        background: "rgba(0,182,122,.92)",
        color: "#fff",
        fontFamily: "var(--font-outfit)",
        fontWeight: 600,
        fontSize: 12,
        boxShadow: "0 6px 24px rgba(0,0,0,.25)",
        opacity: visible ? 1 : 0,
        transition: "all .3s",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}
