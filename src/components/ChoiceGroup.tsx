interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  hint: string;
}

interface ChoiceGroupProps<T extends string> {
  name: string;
  legend: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
}

export function ChoiceGroup<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset className="choice">
      <legend>{legend}</legend>
      <div className="choice-options" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label key={option.value} className={selected ? "choice-option is-selected" : "choice-option"}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              <span className="choice-label">{option.label}</span>
              <span className="choice-hint">{option.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
