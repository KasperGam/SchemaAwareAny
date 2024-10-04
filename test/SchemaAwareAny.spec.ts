import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { UserRoleScalar } from './scalars/UserRoleScalar';
import { DateScalar } from './scalars/DateScalar';
import { buildAnyScalarResolver } from '../src/SchemaAwareAny';

describe('SchemaAwareAny', () => {
  const baseExtendedSchema = gql`
    type Query {
      purchases(userID: ID!): [Product!]!
    }

    type Product @key(fields: "id") {
      id: ID!
      name: String!
      price: String!
    }

    type User @key(fields: "id") {
      id: ID!
      userRole: UserRole @external
      joinDate: Date @external
      hasNewUserBenefit: Boolean @requires(fields: "userRole joinDate")
    }

    """
    Translates a role as a number or enum string
    """
    scalar UserRole
    """
    Translates to a native JS date object from ISO string
    """
    scalar Date
  `;

  const resolvers = {
    Query: {
      purchases(userID: string) {
        return [
          {
            id: userID,
            name: 'Cool Product',
            price: '$5.00',
          },
        ];
      },
    },
    Product: {
      __resolveReference(product) {
        return {
          id: product.id,
          name: 'Cool Product Resolved',
          price: '$1.00',
        };
      },
    },
    UserRole: UserRoleScalar,
    Date: DateScalar,
  };

  const schema = buildSubgraphSchema([
    {
      typeDefs: baseExtendedSchema,
      resolvers,
    },
  ]);

  it('Schema is valid', () => {
    expect(schema).toBeDefined();
  });

  it('Any Scalar is valid', () => {
    const anyScalar = buildAnyScalarResolver({
      schema,
      resolvers,
    });

    expect(anyScalar).toBeDefined();
    expect(anyScalar.name).toEqual(`_Any`);
  });

  it('Can parse with custom scalars successfully', () => {
    const anyScalar = buildAnyScalarResolver({
      schema,
      resolvers,
    });

    const testJoinDate = '2024-01-01T05:00:00.000Z';

    // Example representation type- would come from gateway request as JSON/serialized types
    const userRepresentation = {
      __typename: 'User',
      id: '123',
      userRole: 1,
      joinDate: testJoinDate,
    };

    const mappedValue = anyScalar.parseValue(userRepresentation);

    expect(mappedValue).toEqual(
      expect.objectContaining({
        __typename: 'User',
        id: '123',
        userRole: 'user',
        joinDate: new Date(testJoinDate),
      }),
    );
  });
});
