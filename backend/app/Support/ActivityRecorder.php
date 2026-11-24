<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Collects every database record created, updated or deleted while a request runs, with the
 * old → new value of each field, so the activity log can show exactly what changed
 * (including invoice lines, payments and stock movements made alongside the main record).
 */
class ActivityRecorder
{
    /** Records kept per request; a bulk job (import, flush) is summarised beyond this. */
    private const LIMIT = 300;

    private const SKIP_MODELS = [AuditLog::class, PersonalAccessToken::class];

    private const HIDDEN = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    private const NOISE = ['created_at', 'updated_at'];

    /** Foreign keys shown as a readable name instead of a number. */
    private const LOOKUPS = [
        'store_id' => [\App\Models\Store::class, 'code'],
        'from_store_id' => [\App\Models\Store::class, 'code'],
        'to_store_id' => [\App\Models\Store::class, 'code'],
        'category_id' => [\App\Models\Category::class, 'name'],
        'parent_id' => [\App\Models\Category::class, 'name'],
        'brand_id' => [\App\Models\Brand::class, 'name'],
        'vehicle_brand_id' => [\App\Models\VehicleBrand::class, 'name'],
        'vehicle_model_id' => [\App\Models\VehicleModel::class, 'name'],
        'customer_id' => [\App\Models\Customer::class, 'name'],
        'supplier_id' => [\App\Models\Supplier::class, 'name'],
        'invoice_id' => [\App\Models\Invoice::class, 'invoice_no'],
        'source_invoice_id' => [\App\Models\Invoice::class, 'invoice_no'],
        'product_id' => [\App\Models\Product::class, null],
        'user_id' => [\App\Models\User::class, 'name'],
        'created_by' => [\App\Models\User::class, 'name'],
    ];

    private array $records = [];

    private int $skipped = 0;

    private array $names = [];

    public function created(Model $model): void
    {
        $this->add($model, 'created', collect($model->getAttributes())
            ->except([...self::NOISE, $model->getKeyName()])
            ->filter(fn ($v) => $v !== null && $v !== '')
            ->map(fn ($v, $k) => [null, $this->show($k, $v)])
            ->all());
    }

    public function updated(Model $model): void
    {
        $changes = [];
        foreach ($model->getChanges() as $key => $new) {
            if (in_array($key, self::NOISE, true)) {
                continue;
            }
            $old = $model->getOriginal($key);
            if ($old instanceof \DateTimeInterface) {
                $old = $old->format('Y-m-d H:i:s');
            }
            if ((string) json_encode($old) === (string) json_encode($new) || (is_numeric($old) && is_numeric($new) && (float) $old === (float) $new)) {
                continue;
            }
            $changes[$key] = [$this->show($key, $old), $this->show($key, $new)];
        }
        if ($changes) {
            $this->add($model, 'updated', $changes);
        }
    }

    public function deleted(Model $model): void
    {
        $this->add($model, 'deleted', collect($model->getOriginal())
            ->except(self::NOISE)
            ->filter(fn ($v) => $v !== null && $v !== '')
            ->map(fn ($v, $k) => [$this->show($k, $v), null])
            ->all());
    }

    /** Everything collected for this request, for the activity log entry. */
    public function pull(): array
    {
        $out = $this->records ? ['records' => $this->records] : [];
        if ($this->skipped > 0) {
            $out['more'] = $this->skipped;
        }
        $this->records = [];
        $this->skipped = 0;

        return $out;
    }

    private function add(Model $model, string $event, array $fields): void
    {
        if (in_array($model::class, self::SKIP_MODELS, true)) {
            return;
        }
        if (count($this->records) >= self::LIMIT) {
            $this->skipped++;

            return;
        }
        foreach (self::HIDDEN as $hidden) {
            if (array_key_exists($hidden, $fields)) {
                $fields[$hidden] = [$event === 'created' ? null : '(hidden)', $event === 'deleted' ? null : '(changed)'];
            }
        }

        $this->records[] = [
            'type' => Str::headline(class_basename($model)),
            'id' => $model->getKey(),
            'label' => $this->label($model),
            'event' => $event,
            'fields' => $fields,
        ];
    }

    /** Invoice number, item code + name, store code … whatever identifies the record. */
    private function label(Model $model): ?string
    {
        $a = $model->getAttributes() + $model->getOriginal();
        if (! empty($a['item_code']) && ! empty($a['name'])) {
            return $a['item_code'].' — '.$a['name'];
        }
        foreach (['invoice_no', 'order_no', 'shipment_no', 'transfer_no', 'reference_no', 'code', 'name', 'key', 'email'] as $key) {
            if (! empty($a[$key]) && is_scalar($a[$key])) {
                return (string) $a[$key];
            }
        }
        if (! empty($a['product_id'])) {
            return $this->lookup('product_id', $a['product_id']);
        }

        return null;
    }

    /** A field value as text: names instead of ids, short strings, no huge blobs. */
    private function show(string $key, mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }
        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }
        if (isset(self::LOOKUPS[$key]) && is_scalar($value) && $value !== '') {
            $name = $this->lookup($key, $value);
            if ($name !== null) {
                return $name;
            }
        }
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value);
        }

        return is_string($value) ? Str::limit($value, 300) : $value;
    }

    private function lookup(string $key, mixed $id): ?string
    {
        [$class, $column] = self::LOOKUPS[$key];
        $cacheKey = $class.'#'.$id;
        if (! array_key_exists($cacheKey, $this->names)) {
            try {
                $row = $class::query()->find($id);
                $this->names[$cacheKey] = ! $row ? null : ($column
                    ? (string) $row->{$column}
                    : trim(($row->item_code ? $row->item_code.' — ' : '').$row->name));
            } catch (\Throwable) {
                $this->names[$cacheKey] = null;
            }
        }

        return $this->names[$cacheKey] === null ? null : $this->names[$cacheKey].' (#'.$id.')';
    }
}
