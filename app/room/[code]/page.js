import Game from "@/components/Game";

export default function RoomPage({ params }) {
  return <Game initialCode={params.code.toUpperCase()} />;
}
