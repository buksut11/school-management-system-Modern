export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      <div
        className="absolute -top-[150px] left-[10%] w-[560px] h-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(0,122,255,0.30), transparent 68%)",
        }}
      />
      <div
        className="absolute top-[6%] -right-[130px] w-[520px] h-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(175,82,222,0.24), transparent 68%)" }}
      />
      <div
        className="absolute -bottom-[180px] left-[32%] w-[620px] h-[620px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(48,176,199,0.22), transparent 68%)" }}
      />
      <div
        className="absolute bottom-[8%] right-[16%] w-[380px] h-[380px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,149,0,0.18), transparent 68%)" }}
      />
    </div>
  );
}
