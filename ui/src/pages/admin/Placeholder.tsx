interface Props { title: string; }

export default function Placeholder({ title }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 40 }}>🚧</span>
      <h2 style={{ color: '#fff', margin: 0 }}>{title}</h2>
      <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>Coming soon</p>
    </div>
  );
}
