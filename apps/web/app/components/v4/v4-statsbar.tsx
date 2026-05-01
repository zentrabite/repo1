export function V4Statsbar() {
  return (
    <div id="statsbar">
      <div className="stats-row">
        <div className="reveal">
          <div className="s-n count-up" data-target="2400" data-suffix="+">
            0
          </div>
          <div className="s-l">Orders processed daily</div>
        </div>
        <div className="reveal d1">
          <div className="s-n count-up" data-target="99" data-suffix="%">
            0
          </div>
          <div className="s-l">Uptime SLA</div>
        </div>
        <div className="reveal d2">
          <div className="s-n count-up" data-target="15">
            0
          </div>
          <div className="s-l">Modules in one platform</div>
        </div>
        <div className="reveal d3">
          <div className="s-n" style={{ fontSize: "clamp(22px,2.8vw,40px)" }}>
            1 month
          </div>
          <div className="s-l">Free trial · no card needed</div>
        </div>
      </div>
    </div>
  );
}
