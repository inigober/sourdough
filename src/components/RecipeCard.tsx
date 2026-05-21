import { formatGrams } from '../app/format.ts';

type RecipeCardProps = {
  title: string;
  rows: readonly (readonly [string, number | string])[];
  embedded?: boolean;
};

export function RecipeCard({ title, rows, embedded = false }: RecipeCardProps) {
  const list = (
    <dl className="recipe-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{typeof value === 'number' ? formatGrams(value) : value}</dd>
        </div>
      ))}
    </dl>
  );

  if (embedded) {
    return list;
  }

  return (
    <section className="card">
      <h2>{title}</h2>
      {list}
    </section>
  );
}
