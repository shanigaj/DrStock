export default function MovementQuantity({ quantity }: { quantity: number }) {
  return (
    <span className={`font-semibold tabular-nums ${quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {quantity > 0 ? `+${quantity}` : quantity}
    </span>
  );
}
