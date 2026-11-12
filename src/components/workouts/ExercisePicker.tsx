import { useMemo, useState } from "react";
import { mergedLibrary } from "../../domain/exerciseLibrary.ts";
import { exerciseCategories, type ExerciseCategory, type LibraryExercise } from "../../storage/appData.ts";

export function ExercisePicker({
  stored,
  onAdd,
  onCreate,
  onClose,
}: {
  stored: LibraryExercise[];
  onAdd: (exercise: LibraryExercise) => void;
  onCreate: (exercise: LibraryExercise) => void;
  onClose: () => void;
}) {
  const library = useMemo(() => mergedLibrary(stored), [stored]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<LibraryExercise>({
    id: "",
    name: "",
    muscleGroup: "",
    category: "compound",
    equipment: "",
    instructions: "",
    defaultSets: 3,
    defaultReps: "8–12",
  });
  const needle = query.trim().toLowerCase();
  const matches = library.filter((item) => {
    if (!needle) return true;
    return `${item.name} ${item.muscleGroup} ${item.equipment} ${item.category}`.toLowerCase().includes(needle);
  });

  return (
    <section className="panel">
      <div className="exercise-head">
        <h2>Add exercise</h2>
        <button type="button" className="button quiet" onClick={onClose}>
          Close
        </button>
      </div>
      <label className="field">
        <span>Search the library</span>
        <input value={query} placeholder="Name, muscle, or equipment" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul className="picker-list">
        {matches.map((item) => (
          <li key={item.id} className="picker-row">
            <span>
              <strong>{item.name}</strong>
              <span className="meta">
                {item.muscleGroup || "Any muscle"} · {item.category} · {item.equipment || "Any equipment"} · {item.defaultSets}×{item.defaultReps || "reps"}
              </span>
            </span>
            <button type="button" className="button" onClick={() => onAdd(item)}>
              Add
            </button>
          </li>
        ))}
      </ul>
      {matches.length === 0 ? <p className="meta">No exercises match that search.</p> : null}
      {creating ? (
        <div className="edit-grid">
          <label className="field">
            <span>Name</span>
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="field">
            <span>Muscle group</span>
            <input value={draft.muscleGroup} onChange={(event) => setDraft({ ...draft, muscleGroup: event.target.value })} />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ExerciseCategory })}>
              {exerciseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Equipment</span>
            <input value={draft.equipment} onChange={(event) => setDraft({ ...draft, equipment: event.target.value })} />
          </label>
          <label className="field">
            <span>Sets</span>
            <input
              type="number"
              min="1"
              max="12"
              value={draft.defaultSets}
              onChange={(event) => setDraft({ ...draft, defaultSets: Number(event.target.value) || 1 })}
            />
          </label>
          <label className="field">
            <span>Rep target</span>
            <input value={draft.defaultReps} onChange={(event) => setDraft({ ...draft, defaultReps: event.target.value })} />
          </label>
          <label className="field grow">
            <span>Instructions</span>
            <input value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} />
          </label>
          <div className="inline-actions">
            <button
              type="button"
              className="button primary"
              disabled={!draft.name.trim()}
              onClick={() =>
                onCreate({
                  ...draft,
                  id: crypto.randomUUID(),
                  name: draft.name.trim(),
                  defaultSets: Math.max(1, Math.min(12, Math.round(draft.defaultSets) || 3)),
                })
              }
            >
              Save and add
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="button" onClick={() => setCreating(true)}>
          Create a new exercise
        </button>
      )}
    </section>
  );
}
