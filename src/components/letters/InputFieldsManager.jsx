import { Plus, Trash2 } from "lucide-react";
import { Button, Checkbox, Input, Select } from "../../design-system";
import {
  ANSWER_TYPES,
  CHOICE_ANSWER_TYPE,
  MAX_INPUT_FIELDS,
  answerTypeOf,
  applyAnswerType,
  parseFieldOptions,
  toInputFieldKey,
} from "../../utils/letterForms";
import { LETTERS_COPY, format } from "../../utils/lettersCopy";

const COPY = LETTERS_COPY.editor;

/**
 * Questions HR answers each time the letter is issued. A question's key is derived from its
 * label while it is new and the letter does not use it yet (`keyLocks[index]`, from
 * questionKeyLocks); after that, and once saved, the key is fixed so letter content that uses it
 * keeps working. `onRemove(index)` lets the parent confirm removals.
 */
export default function InputFieldsManager({ fields = [], onChange, errors = {}, onInsert, onRemove, keyLocks = [], disabled = false }) {
  const replace = (index, next) => onChange(fields.map((field, i) => (i === index ? next : field)));

  const updateLabel = (index, label) => {
    const field = fields[index];
    const keyFixed = !field.isNew || Boolean(keyLocks[index]);
    replace(index, { ...field, label, ...(keyFixed ? {} : { key: toInputFieldKey(label) }) });
  };

  const updateOptions = (index, text) => {
    const options = parseFieldOptions(text);
    const { options: _previous, ...field } = fields[index];
    replace(index, { ...field, optionsText: text, ...(options.length ? { options } : {}) });
  };

  const add = () =>
    onChange([...fields, { key: "", label: "", kind: "text", required: true, multiline: false, isNew: true }]);

  const remove = (index) => (onRemove ? onRemove(index) : onChange(fields.filter((_, i) => i !== index)));


  return (
    <div className="wz-fields">
      <p className="wz-letters__cell-sub">{fields.length ? COPY.questionsIntro : COPY.questionsEmpty}</p>
      {fields.map((field, index) => {
        const n = index + 1;
        const label = String(field.label || "").trim();
        const isChoice = answerTypeOf(field) === CHOICE_ANSWER_TYPE;
        return (
          <div key={index} className="wz-fields__row">
            <Input
              label={format(COPY.questionLabel, { n })}
              name={`inputField-${index}-label`}
              value={field.label}
              onChange={(event) => updateLabel(index, event.target.value)}
              error={errors[index]}
              required
              disabled={disabled}
              maxLength={80}
            />
            <Select
              label={COPY.answerType}
              name={`inputField-${index}-kind`}
              value={answerTypeOf(field)}
              onChange={(event) => replace(index, applyAnswerType(field, event.target.value))}
              options={ANSWER_TYPES}
              disabled={disabled}
            />
            {isChoice && (
              <Input
                label={COPY.choices}
                name={`inputField-${index}-options`}
                value={field.optionsText ?? (field.options || []).join(", ")}
                onChange={(event) => updateOptions(index, event.target.value)}
                helperText={COPY.choicesHint}
                placeholder={COPY.choicesPlaceholder}
                required
                disabled={disabled}
                maxLength={1000}
              />
            )}
            <div className="wz-fields__row-foot">
              <Checkbox
                label={COPY.requiredAnswer}
                checked={Boolean(field.required)}
                onChange={(event) => replace(index, { ...field, required: event.target.checked })}
                disabled={disabled}
              />
              <div className="wz-letters__badges">
                {field.key && label && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={format(COPY.insertQuestion, { label })}
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onInsert?.(field.key)}
                  >
                    {COPY.insertIntoLetter}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={16} />}
                  aria-label={label ? format(COPY.removeQuestion, { label }) : format(COPY.removeQuestionFallback, { n })}
                  disabled={disabled}
                  onClick={() => remove(index)}
                />
              </div>
            </div>
          </div>
        );
      })}
      {errors.limit && (
        <p className="wz-fields__error" role="alert">
          {errors.limit}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        icon={<Plus size={16} />}
        onClick={add}
        disabled={disabled || fields.length >= MAX_INPUT_FIELDS}
      >
        {COPY.addQuestion}
      </Button>
    </div>
  );
}
