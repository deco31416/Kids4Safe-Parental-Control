// Compare and swap the original JSON: decoding/re-encoding in Lua would turn
// empty arrays into objects and change permission/capture configuration types.
export const COMPARE_AND_SET_QR = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'KEEPTTL')
return 1
`;
