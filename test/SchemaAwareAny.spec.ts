import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { UserRoleScalar } from './scalars/UserRoleScalar';
import { DateScalar } from './scalars/DateScalar';
import { buildAnyScalarResolver } from '../src/SchemaAwareAny';
import { GraphQLError } from 'graphql';

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
      userRole: UserRole! @external
      joinDate: Date @external
      purchaseDates: [Date]! @external
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

    const purchaseDate1 = '2024-01-01T05:00:00.000Z';
    const purchaseDate2 = '2023-01-01T05:00:00.000Z';
    const purchaseDate3 = '2024-05-01T05:00:00.000Z';

    const testPurchaseDates = [purchaseDate1, purchaseDate2, purchaseDate3];

    // Example representation type- would come from gateway request as JSON/serialized types
    const userRepresentation = {
      __typename: 'User',
      id: '123',
      userRole: 1,
      joinDate: testJoinDate,
      purchaseDates: testPurchaseDates,
    };

    const mappedValue = anyScalar.parseValue(userRepresentation);

    expect(mappedValue).toEqual(
      expect.objectContaining({
        __typename: 'User',
        id: '123',
        userRole: 'user',
        joinDate: new Date(testJoinDate),
        purchaseDates: expect.arrayContaining([
          new Date(purchaseDate1),
          new Date(purchaseDate2),
          new Date(purchaseDate3),
        ]),
      }),
    );
  });

  it('Will not try to parse nullable values when they are null', () => {
    const anyScalar = buildAnyScalarResolver({
      schema,
      resolvers,
    });

    const testJoinDate = null;

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
        joinDate: null,
      }),
    );
  });

  it('Will throw if null values detected for non-nullable field', () => {
    const anyScalar = buildAnyScalarResolver({
      schema,
      resolvers,
    });

    const testJoinDate = null;

    // Example representation type- would come from gateway request as JSON/serialized types
    const userRepresentation = {
      __typename: 'User',
      id: '123',
      userRole: null,
      joinDate: testJoinDate,
    };

    const testRun = () => anyScalar.parseValue(userRepresentation);
    expect(testRun).toThrow(GraphQLError);
  });

  it('Will throw if custom scalar throws', () => {
    const anyScalar = buildAnyScalarResolver({
      schema,
      resolvers,
    });

    const testJoinDate = `not valid date`;

    // Example representation type- would come from gateway request as JSON/serialized types
    const userRepresentation = {
      __typename: 'User',
      id: '123',
      userRole: 1,
      joinDate: testJoinDate,
    };

    const testRun = () => anyScalar.parseValue(userRepresentation);
    expect(testRun).toThrow(GraphQLError);
  });
});
