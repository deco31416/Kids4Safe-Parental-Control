from fnmatch import fnmatch


class FakePipeline:
    def __init__(self, redis):
        self.redis = redis
        self.commands = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return None

    async def watch(self, _):
        return True

    async def get(self, key):
        return await self.redis.get(key)

    def multi(self):
        return None

    def setex(self, key, ttl, value):
        self.commands.append((key, ttl, value))

    async def execute(self):
        for key, ttl, value in self.commands:
            await self.redis.setex(key, ttl, value)
        return [True] * len(self.commands)


class FakeRedis:
    def __init__(self):
        self.data = {}
        self.ttls = {}
        self.closed = False

    async def ping(self):
        return True

    async def aclose(self):
        self.closed = True

    async def setex(self, key, ttl, value):
        self.data[key] = value
        self.ttls[key] = ttl
        return True

    async def get(self, key):
        return self.data.get(key)

    async def mget(self, keys):
        return [self.data.get(key) for key in keys]

    async def scan_iter(self, match, count=100):
        del count
        for key in list(self.data):
            if fnmatch(key, match):
                yield key

    def pipeline(self, transaction=True):
        del transaction
        return FakePipeline(self)
