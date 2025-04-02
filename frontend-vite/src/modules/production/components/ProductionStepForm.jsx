import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import GuideItemSelector from './GuideItemSelector';
import { Button } from '@/components/ui/button';

const ProductionStepForm = ({ index, step, control, register, remove, roles }) => {
  return (
    <div className="border p-4 rounded-xl shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-md font-semibold">Krok #{index + 1}</h4>
        <Button variant="ghost" onClick={remove}>
          Usuń
        </Button>
      </div>

      <div>
        <label>Nazwa kroku</label>
        <Input {...register(`steps.${index}.title`, { required: true })} />
      </div>

      <div>
        <label>Przewidywany czas (min)</label>
        <Input
          type="number"
          {...register(`steps.${index}.estimatedTimeMinutes`, { valueAsNumber: true })}
        />
      </div>

      <div>
        <label>Przypisana rola</label>
        <Select {...register(`steps.${index}.assignedRoleId`, { required: true })}>
          <option value="">-- wybierz --</option>
          {roles?.map((role) => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
        </Select>
      </div>

      <div>
        <label>Rezerwacja zasobów magazynowych</label>
        <GuideItemSelector index={index} control={control} />
      </div>

      <div>
        <label>Uwagi</label>
        <Textarea {...register(`steps.${index}.note`)} />
      </div>
    </div>
  );
};

export default ProductionStepForm;