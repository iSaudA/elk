import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileService, validateFields, validateCv, MAX_CV_BYTES } from '../server/profile-service.js';
import { profiles } from '../profiles.js';
const pdf = Buffer.from('%PDF-1.4\nTest fixture\n%%EOF');
function setup() {
  const records = new Map(); let open = true;
  const storage = {
    async readJson(path) { return structuredClone(records.get(path) || null); },
    async writeJson(path, data, etag) {
      const old = records.get(path);
      if (old && old.etag !== etag || !old && etag) throw new Error('conflict');
      records.set(path, { data: structuredClone(data), etag: String(Number(old?.etag || 0) + 1) });
    },
    async writePdf(path, data) { records.set(path, Buffer.from(data)); },
    async readPdf(path) { return records.get(path); },
    isConflict(error) { return error.message === 'conflict'; },
  };
  return { service: createProfileService(storage, { editingOpen: () => open }), records, close: () => { open = false; } };
}
const input = (fields = profiles[0], revision = null) => ({ fields, revision });
test('changes and a PDF persist across service reads; other profiles stay separate', async () => {
  const {service,records} = setup();
  const before = await service.list();
  const saved = await service.save('saud', {...input({...profiles[0],name:'Updated Name',github:'https://github.com/iSaudA',linkedin:'https://linkedin.com/in/example?trk=test'}),cv:{name:'CV.pdf',base64:pdf.toString('base64')}});
  const after = await service.list();
  assert.equal(after.profiles[0].name, 'Updated Name');
  assert.equal(saved.github,'iSaudA'); assert.equal(saved.linkedin,'https://www.linkedin.com/in/example');
  assert.match(saved.resumePdf,/^\/api\/resume\?id=saud/);
  assert.equal(saved.resumeName,'CV.pdf'); assert.deepEqual(await service.resume('saud'),pdf);
  assert.deepEqual(after.profiles.slice(1),before.profiles.slice(1));
  assert.ok([...records.keys()].some(path=>path.includes('/history/')));
});
test('concurrent initial saves allow only one winner; stale edits cannot overwrite', async () => {
  const {service} = setup();
  const outcomes=await Promise.allSettled([service.save('saud',input()),service.save('saud',input({...profiles[0],name:'Other'}))]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,409);
  await assert.rejects(service.save('saud',input()),error=>error.status===409);
});
test('replacing and removing a CV keep the chosen profile correct',async()=>{
  const {service} = setup();
  let saved=await service.save('saud',{...input(),cv:{name:'first.pdf',base64:pdf.toString('base64')}});
  saved=await service.save('saud',{...input(profiles[0],saved.revision),cv:{name:'second.pdf',base64:pdf.toString('base64')}});
  assert.equal(saved.resumeName,'second.pdf');
  saved=await service.save('saud',{...input(profiles[0],saved.revision),removeCv:true});
  assert.equal(saved.resumePdf,null);
  await assert.rejects(service.resume('saud'),error=>error.status===404);
});
test('closing editing blocks saves without removing the published details',async()=>{
  const {service,close}=setup(); await service.save('saud',input()); close();
  const listing=await service.list(); assert.equal(listing.editingOpen,false);
  await assert.rejects(service.save('saud',input()),error=>error.status===403);
  assert.equal(listing.profiles[0].name,'Saud');
});
test('invalid links, fields, IDs and disguised or oversized PDFs are rejected',async()=>{
  const {service}=setup();
  assert.throws(()=>validateFields({...profiles[0],linkedin:'javascript:alert(1)'}));
  assert.throws(()=>validateFields({...profiles[0],linkedin:'https://linkedin.com.evil.test/in/user'}));
  assert.throws(()=>validateFields({...profiles[0],name:''}));
  assert.throws(()=>validateFields({...profiles[0],skills:['a'.repeat(81)]}));
  assert.throws(()=>validateCv({name:'fake.pdf',base64:Buffer.from('<html>').toString('base64')}));
  assert.throws(()=>validateCv({name:'large.pdf',base64:Buffer.alloc(MAX_CV_BYTES+1).toString('base64')}),error=>error.status===413);
  await assert.rejects(service.save('../invalid',input()),error=>error.status===404);
  await assert.rejects(service.save('saud',{...input(),removeCv:true,cv:{}}),error=>error.status===400);
});
