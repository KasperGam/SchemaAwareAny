# graphql-schema-aware-any

This is a simple project that offers a replacement `_Any` scalar definition for Apollo Federated subgraphs. The default implementation returns the result of parsing the raw JSON from the `entities` query as the `representations` arguments.

Instead, a schema aware implementation of `_Any` can detect the correct types for all of the values passed in and parse them as such, using an existing list of resolvers and the built schema. This is particularly useful for cases using custom scalars in an extended field on a subgraph.

This will fix this issue on [apollo-federation](https://github.com/apollographql/federation/issues/1197)

## Usage

To use this correctly, add it as a scalar resolver as you construct apollo server.

```typescript
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { buildAnyScalarResolver } from 'graphql-schema-aware-any';

const typeDefs = gql`...`;

// Add any custom scalar resolvers here
const resolvers = {...};

// Construct a schema to give to the any scalar so it can resolve custom scalars by itself
const schema = buildSubgraphSchema([{ typeDefs, resolvers }]);
const AnyScalar = buildAnyScalarResolver({ schema, resolvers });

const server = new ApolloServer({
    typeDefs,
    resolvers: {
        ...resolvers,
        _Any: AnyScalar,
    }
});
```
