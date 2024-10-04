# SchemaAwareAny

This is a simple project that offers a replacement `_Any` scalar definition for Apollo Federated subgraphs. The default implementation returns the result of parsing the raw JSON from the `entities` query as the `representations` arguments.

Instead, a schema aware implementation of `_Any` can detect the correct types for all of the values passed in and parse them as such, using an existing list of resolvers and the built schema. This is particularly useful for cases using custom scalars in an extended field on a subgraph.
