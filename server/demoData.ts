import { prisma } from "./db.js";
import { generateEmbedding } from "./ai/embeddings.js";

export const DEMO_DSA_PAGES = [
  {
    pageNumber: 1,
    title: "1. Linear Data Structures: Arrays & Memory Contiguity",
    text: `Chapter 1: Arrays and Memory Layout
An array is a collection of items stored at contiguous memory locations. The idea is to store multiple items of the same type together.
- Random Access: In an array, accessing any element by its index takes O(1) constant time because the memory address is calculated as Base_Address + (Index * Element_Size).
- Insertion and Deletion: Inserting or deleting an element at an arbitrary position requires shifting adjacent elements, which costs O(n) in the worst and average cases.
- Dynamic Arrays: In languages like Python (list) or Java (ArrayList), dynamic arrays double their capacity when full. While resizing takes O(n), the amortized time per insertion remains O(1).
- Key Trade-offs: Arrays offer excellent cache locality and fast read performance, but require upfront memory allocation or expensive reallocation on resizing.`,
  },
  {
    pageNumber: 2,
    title: "2. Linked Lists: Singly, Doubly, and Pointer Mechanics",
    text: `Chapter 2: Linked Lists
A linked list is a linear collection of data elements whose order is not given by their physical placement in memory. Instead, each element points to the next.
- Node Structure: Each node contains a data field and a reference (pointer) to the next node. In a Doubly Linked List, nodes also contain a pointer to the preceding node.
- Insertion and Deletion: Once a node reference is located, inserting or removing a node takes O(1) pointer updates, without shifting subsequent elements.
- Traversal & Search: Random access is not possible; accessing the k-th element requires sequential traversal from the head node, taking O(n) time.
- Memory Overhead: Linked lists use extra memory for pointers (8 bytes per pointer on 64-bit architectures) and suffer from poorer CPU cache locality compared to contiguous arrays.
- Common Use Cases: Implementing undo/redo buffers, circular task schedulers, and queue buffering.`,
  },
  {
    pageNumber: 3,
    title: "3. Abstract Data Types: Stacks (LIFO) and Queues (FIFO)",
    text: `Chapter 3: Stacks and Queues
- Stacks: A Stack follows the Last-In, First-Out (LIFO) discipline. Primary operations:
  * push(item): Inserts an element on top of the stack — O(1).
  * pop(): Removes and returns the top element — O(1).
  * peek(): Inspects the top element without removal — O(1).
  * Applications: Function call stacks, recursion management, syntax parsing, bracket matching, and depth-first search (DFS).
- Queues: A Queue adheres to the First-In, First-Out (FIFO) protocol. Primary operations:
  * enqueue(item): Appends an element to the rear/tail — O(1).
  * dequeue(): Removes and returns the front/head element — O(1).
  * Applications: Breadth-first search (BFS), printer spooling, message brokers, and CPU round-robin scheduling.
- Circular Queues: Implemented on static arrays using modulo arithmetic (head = (head + 1) % size) to prevent memory drift without shifting elements.`,
  },
  {
    pageNumber: 4,
    title: "4. Hierarchical Structures: Binary Trees & BST Invariants",
    text: `Chapter 4: Binary Trees & Binary Search Trees (BST)
A tree is a non-linear hierarchical data structure consisting of nodes connected by edges.
- Binary Tree Definition: Each node has at most two children: a left child and a right child.
- Binary Search Tree (BST) Invariant: For any node X, all values in its left subtree are strictly less than X.val, and all values in its right subtree are strictly greater than X.val.
- Search Complexity:
  * Average Case (Balanced): O(log n) time, where height h = floor(log2 n).
  * Worst Case (Skewed): O(n) time, degenerating into a linked list if elements are inserted in sorted order.
- Self-Balancing Trees: AVL Trees and Red-Black Trees maintain balance invariants via tree rotations (Left Rotation, Right Rotation), guaranteeing strict O(log n) worst-case time for search, insert, and delete operations.
- Tree Traversals:
  * In-order (Left, Root, Right): Yields elements of a BST in ascending sorted order.
  * Pre-order (Root, Left, Right): Useful for serializing or cloning tree hierarchies.
  * Post-order (Left, Right, Root): Essential for bottom-up computation (e.g., computing subtree sizes or evaluating expression trees).`,
  },
  {
    pageNumber: 5,
    title: "5. Network Models: Graph Representations & Traversal Algorithms",
    text: `Chapter 5: Graph Theory and Core Algorithms
A graph G = (V, E) consists of a set of vertices V and edges E.
- Representations:
  * Adjacency Matrix: A 2D array of size |V| x |V|. Fast edge lookup in O(1), but consumes O(V^2) space. Ideal for dense graphs.
  * Adjacency List: An array of lists where each vertex stores its neighbors. Space complexity O(V + E). Superior for sparse graphs.
- Breadth-First Search (BFS):
  * Explores nodes layer-by-layer using a Queue.
  * Computes the shortest path on unweighted graphs in O(V + E) time.
- Depth-First Search (DFS):
  * Explores as deep as possible along each branch before backtracking using a Stack or recursion.
  * Used for topological sorting, cycle detection, and strongly connected components (Tarjan/Kosaraju).
- Dijkstra's Algorithm: Computes single-source shortest paths on non-negative weighted graphs using a Min-Heap priority queue in O((V + E) log V) time.`,
  },
  {
    pageNumber: 6,
    title: "6. Asymptotic Analysis: Big-O Reference & Space-Time Trade-offs",
    text: `Chapter 6: Asymptotic Analysis and Complexity Reference
Big-O notation describes the upper bound of an algorithm's execution time or memory requirements as input size n approaches infinity.
- O(1) Constant: Hash table lookup (average), Array indexing, Stack push/pop.
- O(log n) Logarithmic: Binary search on sorted arrays, Balanced BST operations.
- O(n) Linear: Linear search, Array traversal, Linked list traversal.
- O(n log n) Linearithmic: Optimal comparison-based sorting (Merge Sort, Heap Sort, Quick Sort average).
- O(n^2) Quadratic: Nested loops, Bubble Sort, Selection Sort, Insertion Sort.
- O(2^n) Exponential: Naive recursive Fibonacci, subset generation.
- Space-Time Trade-off: Caching, precomputation, memoization (Dynamic Programming), and hash indexing sacrifice memory space to achieve drastic reductions in time complexity.`,
  },
];

export async function seedDemoDocumentForUser(userId: string) {
  // Check if demo document already exists
  const existing = await prisma.document.findFirst({
    where: {
      userId,
      title: "Data Structures & Algorithms.pdf",
    },
  });

  if (existing) {
    return existing;
  }

  const fullText = DEMO_DSA_PAGES.map((p) => `--- [Page ${p.pageNumber}] ---\n${p.text}`).join("\n\n");

  const doc = await prisma.document.create({
    data: {
      userId,
      title: "Data Structures & Algorithms.pdf",
      fileName: "Data_Structures_and_Algorithms.pdf",
      fileType: "pdf",
      fileSize: 184500,
      pageCount: DEMO_DSA_PAGES.length,
      status: "Ready",
      rawText: fullText,
      summary: `This comprehensive reference guide covers foundational computer science data structures and algorithmic complexity. It provides rigorous mathematical definitions, memory representations, time-space complexity bounds, and real-world system use cases for Arrays, Linked Lists, Stacks, Queues, Binary Search Trees, and Graphs.`,
      keyConcepts: JSON.stringify([
        "Memory contiguity and amortized O(1) dynamic array resizing",
        "Pointer-based node chaining in singly and doubly linked lists",
        "LIFO stack and FIFO queue mechanics for call stacks and scheduling",
        "Binary Search Tree invariants and self-balancing rotations",
        "Graph adjacency representations, BFS shortest paths, and DFS topological sort",
        "Asymptotic Big-O time and space complexity trade-offs",
      ]),
      examTips: JSON.stringify([
        "Be ready to compare array vs linked list cache locality and random access on tests.",
        "Remember that in-order traversal of a BST always yields values in sorted ascending order.",
        "Dijkstra's algorithm strictly requires non-negative edge weights; use Bellman-Ford if negative weights exist.",
      ]),
    },
  });

  // Create semantic chunks with embeddings for each page
  for (const page of DEMO_DSA_PAGES) {
    const vec = await generateEmbedding(page.text);
    await prisma.documentChunk.create({
      data: {
        documentId: doc.id,
        chunkIndex: page.pageNumber - 1,
        pageNumber: page.pageNumber,
        content: page.text,
        embedding: JSON.stringify(vec),
      },
    });
  }

  // Create initial demo flashcards
  const flashcardData = [
    {
      front: "What is the time complexity of accessing an element in an Array by its index?",
      back: "O(1) constant time, because the memory address is computed directly as Base_Address + (Index * Element_Size).",
      difficulty: "Easy",
    },
    {
      front: "Why do Linked Lists have poorer cache locality than Arrays?",
      back: "Array elements reside in contiguous memory addresses, maximizing CPU cache line hits. Linked list nodes are scattered across the heap, causing frequent cache misses.",
      difficulty: "Medium",
    },
    {
      front: "What invariant must hold true for all nodes in a Binary Search Tree (BST)?",
      back: "All node values in the left subtree must be strictly less than the root value, and all node values in the right subtree must be strictly greater.",
      difficulty: "Medium",
    },
    {
      front: "What is the primary difference between Breadth-First Search (BFS) and Depth-First Search (DFS)?",
      back: "BFS uses a Queue to explore neighbor nodes layer-by-layer (finding shortest paths on unweighted graphs). DFS uses a Stack (or recursion) to explore as deep as possible before backtracking.",
      difficulty: "Hard",
    },
  ];

  for (const fc of flashcardData) {
    await prisma.flashcard.create({
      data: {
        userId,
        documentId: doc.id,
        deckTitle: "Data Structures & Algorithms",
        front: fc.front,
        back: fc.back,
        difficulty: fc.difficulty,
        repetitions: 1,
        interval: 1,
      },
    });
  }

  // Create initial demo quiz
  const quiz = await prisma.quiz.create({
    data: {
      userId,
      documentId: doc.id,
      title: "Data Structures & Algorithms Mastery Check",
      topic: "Core Data Structures & Complexity",
      subject: "Computer Science",
      difficulty: "Medium",
      questionCount: 4,
    },
  });

  const quizQuestions = [
    {
      question: "Which of the following operations on a standard singly linked list takes O(1) time if only a pointer to the head node is given?",
      type: "mcq",
      options: [
        "Inserting a new node at the head",
        "Deleting the tail node",
        "Accessing the middle node",
        "Searching for an arbitrary value",
      ],
      correctAnswer: "Inserting a new node at the head",
      explanation: "Inserting at the head simply requires pointing the new node's next pointer to the current head and updating the head pointer — taking O(1) operations.",
      orderIndex: 0,
    },
    {
      question: "True or False: In-order traversal of a Binary Search Tree (BST) visits nodes in non-decreasing (sorted) order.",
      type: "true_false",
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "In-order traversal visits (Left, Root, Right), which recursively processes smaller keys before the root and the root before larger keys.",
      orderIndex: 1,
    },
    {
      question: "What is the worst-case time complexity of searching in an unbalanced, skewed Binary Search Tree?",
      type: "mcq",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctAnswer: "O(n)",
      explanation: "If elements are inserted in sorted order, the BST degenerates into a linear chain (linked list), causing search to degrade to O(n).",
      orderIndex: 2,
    },
    {
      question: "Which data structure is fundamentally utilized to implement Breadth-First Search (BFS)?",
      type: "mcq",
      options: ["Stack", "Queue", "Priority Queue", "Hash Map"],
      correctAnswer: "Queue",
      explanation: "BFS enforces First-In, First-Out (FIFO) discovery ordering of frontier vertices using a Queue.",
      orderIndex: 3,
    },
  ];

  for (const q of quizQuestions) {
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        question: q.question,
        type: q.type,
        options: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        orderIndex: q.orderIndex,
      },
    });
  }

  // Create initial demo study plan
  const plan = await prisma.studyPlan.create({
    data: {
      userId,
      title: "DSA Semester Finals Preparation",
      examName: "Computer Science 201: Data Structures Finals",
      examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks ahead
      targetHoursPerDay: 2.5,
      currentLevel: "Intermediate",
      subjects: JSON.stringify(["Linear Data Structures", "Trees & Graphs", "Complexity Analysis"]),
    },
  });

  const planTasks = [
    { dayOfWeek: "Monday", subject: "Linear Data Structures", topic: "Array memory layout and linked list pointer operations", startTime: "06:00 PM", endTime: "07:15 PM" },
    { dayOfWeek: "Tuesday", subject: "Abstract Data Types", topic: "Stack call frames, recursion bounds, and queue buffering", startTime: "06:00 PM", endTime: "07:15 PM" },
    { dayOfWeek: "Wednesday", subject: "Trees", topic: "Binary Search Tree insertions, deletions, and AVL rotation cases", startTime: "06:00 PM", endTime: "07:30 PM" },
    { dayOfWeek: "Thursday", subject: "Graphs", topic: "Breadth-First Search shortest paths and Dijkstra with priority queues", startTime: "06:00 PM", endTime: "07:30 PM" },
    { dayOfWeek: "Friday", subject: "Complexity", topic: "Big-O space vs time trade-offs and master theorem proofs", startTime: "05:30 PM", endTime: "07:00 PM" },
    { dayOfWeek: "Saturday", subject: "Comprehensive Review", topic: "Active recall flashcard drill and full mock exam quiz", startTime: "10:00 AM", endTime: "12:30 PM" },
  ];

  for (const t of planTasks) {
    await prisma.studyTask.create({
      data: {
        studyPlanId: plan.id,
        dayOfWeek: t.dayOfWeek,
        subject: t.subject,
        topic: t.topic,
        startTime: t.startTime,
        endTime: t.endTime,
        isCompleted: t.dayOfWeek === "Monday", // 1 completed task to show progress
        completedAt: t.dayOfWeek === "Monday" ? new Date() : null,
      },
    });
  }

  // Update or create user's progress
  await prisma.progress.upsert({
    where: { userId },
    update: {
      streakDays: 4,
      totalHoursStudied: 8.5,
      topicsCompleted: 6,
      flashcardsReviewed: 28,
      quizAverage: 87.5,
      lastActiveDate: new Date(),
    },
    create: {
      userId,
      streakDays: 4,
      totalHoursStudied: 8.5,
      topicsCompleted: 6,
      flashcardsReviewed: 28,
      quizAverage: 87.5,
      lastActiveDate: new Date(),
    },
  });

  // Add initial study session records for analytics
  const today = new Date();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    await prisma.studySession.create({
      data: {
        userId,
        durationMinutes: 45 + (i * 15) % 40,
        topic: i % 2 === 0 ? "Data Structures" : "Algorithms",
        sessionType: i % 2 === 0 ? "Reading" : "Quiz",
        date: d,
      },
    });
  }

  return doc;
}
