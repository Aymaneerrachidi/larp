import pg from 'pg'

export const schema = `
CREATE TABLE IF NOT EXISTS larp_access (key text PRIMARY KEY, value text NOT NULL, expires_at timestamptz);
CREATE INDEX IF NOT EXISTS larp_access_expiry ON larp_access(expires_at) WHERE expires_at IS NOT NULL;
CREATE OR REPLACE FUNCTION larp_atomic(op text, keys text[], args text[]) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  k text; i integer; vals text[] := '{}'; expiry timestamptz[] := '{}';
  v text; e timestamptz; n bigint; result text;
BEGIN
  FOR k IN SELECT DISTINCT u FROM unnest(keys) u ORDER BY u LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(k, 0));
  END LOOP;
  FOR i IN 1..array_length(keys, 1) LOOP
    SELECT value, expires_at INTO v,e FROM larp_access WHERE key=keys[i] AND (expires_at IS NULL OR expires_at > clock_timestamp());
    vals[i] := v; expiry[i] := e;
  END LOOP;
  CASE op
    WHEN 'set' THEN vals[1] := args[1]; expiry[1] := CASE WHEN args[2] IS NULL THEN NULL ELSE clock_timestamp() + args[2]::double precision * interval '1 second' END; result := '1';
    WHEN 'del' THEN vals[1] := NULL; result := '1';
    WHEN 'take' THEN result := vals[1]; vals[1] := NULL;
    WHEN 'rate' THEN
      n := COALESCE(vals[1]::bigint,0)+1;
      IF vals[1] IS NULL THEN expiry[1] := clock_timestamp() + args[1]::double precision * interval '1 second'; END IF;
      vals[1] := n::text; result := n::text;
    WHEN 'reserve' THEN
      IF GREATEST(COALESCE(vals[1]::bigint,0),COALESCE(vals[2]::bigint,0)) >= args[1]::bigint THEN RETURN '0'; END IF;
      FOR i IN 1..array_length(keys,1) LOOP vals[i] := (COALESCE(vals[i]::bigint,0)+1)::text; expiry[i] := NULL; END LOOP; result := '1';
    WHEN 'refund' THEN
      FOR i IN 1..array_length(keys,1) LOOP vals[i] := GREATEST(0,COALESCE(vals[i]::bigint,0)-1)::text; expiry[i] := NULL; END LOOP; result := '1';
    WHEN 'merge' THEN
      n := GREATEST(COALESCE(vals[1]::bigint,0),COALESCE(vals[2]::bigint,0));
      FOR i IN 1..array_length(keys,1) LOOP vals[i] := n::text; expiry[i] := NULL; END LOOP; result := n::text;
    WHEN 'credit' THEN
      IF vals[1] IS NOT NULL OR vals[3] IS NOT NULL THEN RETURN COALESCE(vals[2],'0'); END IF;
      n := GREATEST(COALESCE(vals[2]::bigint,0),args[1]::bigint)+args[2]::bigint;
      vals := ARRAY['1',n::text,'1']; expiry := ARRAY[NULL,NULL,NULL]::timestamptz[]; result := n::text;
    ELSE RAISE EXCEPTION 'Unknown access operation';
  END CASE;
  FOR i IN 1..array_length(keys,1) LOOP
    IF vals[i] IS NULL THEN DELETE FROM larp_access WHERE key=keys[i];
    ELSE INSERT INTO larp_access(key,value,expires_at) VALUES(keys[i],vals[i],expiry[i])
      ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,expires_at=EXCLUDED.expires_at;
    END IF;
  END LOOP;
  RETURN result;
END $$;
`

// Atomic operations execute entirely inside Postgres, including locks on absent
// keys. Pooled connections need no session affinity or client-side transaction.
export class PostgresStore {
  constructor(connectionString, namespace = process.env.ACCESS_NAMESPACE || 'production') {
    this.namespace = namespace
    const url = new URL(connectionString)
    if (url.searchParams.get('sslmode') === 'require') url.searchParams.set('sslmode', 'verify-full')
    this.pool = new pg.Pool({ connectionString: url.toString(), max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000, allowExitOnIdle: true, statement_timeout: 10000 })
    this.pool.on('error', () => console.error('Access database connection interrupted'))
  }
  key(k) { return `${this.namespace}:${k}` }
  async migrate() { await this.pool.query(schema) }
  async get(k) {
    const { rows } = await this.pool.query('SELECT value FROM larp_access WHERE key=$1 AND (expires_at IS NULL OR expires_at > now())', [this.key(k)])
    return rows[0]?.value ?? null
  }
  async eval(name, keys, args = []) {
    const unique = [...new Set(keys)].map(k => this.key(k))
    const { rows } = await this.pool.query('SELECT larp_atomic($1,$2::text[],$3::text[]) AS result', [name, unique, args.map(String)])
    return name === 'take' ? rows[0].result : Number(rows[0].result)
  }
  set(k, value, seconds) { return this.eval('set', [k], [value, ...(seconds ? [seconds] : [])]) }
  del(k) { return this.eval('del', [k]) }
  async prune() {
    const result = await this.pool.query('DELETE FROM larp_access WHERE expires_at < now() AND key IN (SELECT key FROM larp_access WHERE expires_at < now() LIMIT 10000)')
    return result.rowCount
  }
  close() { return this.pool.end() }
}
